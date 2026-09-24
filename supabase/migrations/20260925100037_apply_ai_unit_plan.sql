create function public.apply_ai_unit_plan(p_draft_id uuid, p_expected_updated_at timestamptz)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_draft public.ai_material_drafts%rowtype;
  v_module public.modules%rowtype;
  v_source public.learning_resources%rowtype;
  v_plan jsonb;
  v_unit jsonb;
  v_activity jsonb;
  v_unit_id uuid;
  v_stage_id uuid;
  v_unit_ids jsonb := '[]'::jsonb;
  v_applied_ids jsonb;
  v_sequence integer;
  v_index integer;
  v_stage_keys text[] := array['interpretation','analysis','evaluation','inference','explanation','reflection'];
begin
  if v_actor is null or not public.has_role('lecturer') or public.current_organization_id() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_draft from public.ai_material_drafts where id = p_draft_id for update;
  if not found or not public.is_lecturer_of_class(v_draft.class_id)
     or public.organization_of_class(v_draft.class_id) is distinct from public.current_organization_id() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_draft.instruction->>'kind' is distinct from 'six_unit_plan' then
    raise exception 'invalid_unit_plan' using errcode = '22023';
  end if;

  select after->'unitIds' into v_applied_ids from public.audit_logs
  where action = 'ai_unit_plan_applied' and subject_table = 'ai_material_drafts' and subject_id = p_draft_id
  order by created_at limit 1;
  if v_applied_ids is not null then
    return jsonb_build_object('unitIds', v_applied_ids, 'alreadyApplied', true);
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'not_reviewable' using errcode = '23001';
  end if;
  if p_expected_updated_at is null or v_draft.updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_draft' using errcode = '23001';
  end if;

  select * into v_module from public.modules
  where id = (v_draft.instruction->>'moduleId')::uuid and class_id = v_draft.class_id
    and deleted_at is null and status <> 'archived'
  for update;
  if not found or not exists (select 1 from public.classes where id = v_draft.class_id and deleted_at is null and status <> 'archived') then
    raise exception 'module_not_found' using errcode = '23001';
  end if;

  select * into v_source from public.learning_resources
  where id = v_draft.source_resource_id and class_id = v_draft.class_id and deleted_at is null
    and extraction_status = 'succeeded';
  if not found or v_source.extracted_text is null or v_draft.grounding <> 'source_bound'
     or encode(extensions.digest(convert_to(v_source.extracted_text, 'UTF8'), 'sha256'), 'hex')
        is distinct from v_draft.instruction->>'sourceTextHash' then
    raise exception 'source_changed' using errcode = '23001';
  end if;

  v_plan := v_draft.output::jsonb;
  if v_plan->>'kind' is distinct from 'six_unit_plan' or jsonb_typeof(v_plan->'units') is distinct from 'array' then
    raise exception 'invalid_unit_plan' using errcode = '22023';
  end if;
  if jsonb_array_length(v_plan->'units') <> 6
     or (select count(distinct lower(btrim(item->>'title'))) from jsonb_array_elements(v_plan->'units') item) <> 6 then
    raise exception 'invalid_unit_plan' using errcode = '22023';
  end if;

  select coalesce(max(sequence), 0) into v_sequence from public.learning_units where module_id = v_module.id;
  for v_unit in select value from jsonb_array_elements(v_plan->'units') loop
    if jsonb_typeof(v_unit->'activities') is distinct from 'array' then
      raise exception 'invalid_unit_plan' using errcode = '22023';
    end if;
    if jsonb_array_length(v_unit->'activities') <> 6
       or coalesce(length(btrim(v_unit->>'title')),0) not between 3 and 200
       or coalesce(length(btrim(v_unit->>'objective')),0) not between 10 and 1000
       or coalesce(length(btrim(v_unit->>'sourceExcerpt')),0) not between 20 and 800
       or coalesce(length(btrim(v_unit->'case'->>'title')),0) not between 3 and 200
       or coalesce(length(btrim(v_unit->'case'->>'context')),0) not between 10 and 1000
       or coalesce(length(btrim(v_unit->'case'->>'body')),0) not between 50 and 4000
       or coalesce(length(btrim(v_unit->'case'->>'keyQuestion')),0) not between 10 and 1000 then
      raise exception 'invalid_unit_plan' using errcode = '22023';
    end if;
    if position(regexp_replace(normalize(btrim(v_unit->>'sourceExcerpt'), NFC), '\s+', ' ', 'g')
      in regexp_replace(normalize(v_source.extracted_text, NFC), '\s+', ' ', 'g')) = 0 then
      raise exception 'untraceable_output' using errcode = '22023';
    end if;

    v_sequence := v_sequence + 1;
    insert into public.learning_units(module_id, title, objective, sequence, status, unit_kind, created_by)
    values(v_module.id, btrim(v_unit->>'title'), btrim(v_unit->>'objective'), v_sequence, 'draft', 'core', v_actor)
    returning id into v_unit_id;
    insert into public.cases(learning_unit_id, title, context, body, key_question, created_by)
    values(v_unit_id, v_unit->'case'->>'title', v_unit->'case'->>'context', v_unit->'case'->>'body', v_unit->'case'->>'keyQuestion', v_actor);

    for v_index in 0..5 loop
      v_activity := v_unit->'activities'->v_index;
      if v_activity->>'stageKey' is distinct from v_stage_keys[v_index + 1]
         or coalesce(length(btrim(v_activity->>'title')),0) not between 3 and 200
         or coalesce(length(btrim(v_activity->>'prompt')),0) not between 20 and 2000
         or coalesce(v_activity->>'responseSchema','') not in ('free_text','cer') then
        raise exception 'invalid_unit_plan' using errcode = '22023';
      end if;
      select id into strict v_stage_id from public.learning_stages
      where learning_unit_id = v_unit_id and stage_key::text = v_stage_keys[v_index + 1];
      insert into public.activities(learning_stage_id, title, prompt, activity_type, response_schema,
        sequence, status, allows_ai, requires_attempt_before_ai, created_by)
      values(v_stage_id, v_activity->>'title', v_activity->>'prompt',
        case when v_index = 5 then 'reflection' else 'written_response' end,
        v_activity->>'responseSchema', 1, 'draft', false, true, v_actor);
    end loop;
    v_unit_ids := v_unit_ids || jsonb_build_array(v_unit_id);
  end loop;

  update public.ai_material_drafts set status = 'approved', approved_by = v_actor, approved_at = now()
  where id = p_draft_id;
  insert into public.audit_logs(actor_id, actor_role, action, subject_table, subject_id, after)
  values(v_actor, 'lecturer', 'ai_unit_plan_applied', 'ai_material_drafts', p_draft_id,
    jsonb_build_object('classId', v_draft.class_id, 'moduleId', v_module.id, 'unitIds', v_unit_ids,
      'sourceResourceId', v_draft.source_resource_id, 'model', v_draft.model, 'promptVersion', v_draft.prompt_version));
  return jsonb_build_object('unitIds', v_unit_ids, 'alreadyApplied', false);
end;
$$;

revoke execute on function public.apply_ai_unit_plan(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_ai_unit_plan(uuid, timestamptz) to authenticated;
