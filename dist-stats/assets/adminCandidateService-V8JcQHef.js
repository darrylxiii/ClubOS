import{s as n}from"./index-T2VZWyPA.js";const _={async getUnifiedCandidate(e){const{data:t,error:r}=await n.rpc("get_candidate_complete_data",{p_candidate_id:e});return{data:t,error:r}},async getAllCandidates(e={}){try{let t=n.from("candidate_profiles").select(`
          id,
          full_name,
          email,
          phone,
          current_title,
          current_company,
          linkedin_url,
          invitation_status,
          assigned_strategist_id,
          profile_completeness,
          created_at,
          merged_at,
          user_id
        `);e.strategistId&&(t=t.eq("assigned_strategist_id",e.strategistId)),e.searchTerm&&(t=t.or(`full_name.ilike.%${e.searchTerm}%,email.ilike.%${e.searchTerm}%`));const{data:r,error:a}=await t.order("created_at",{ascending:!1});if(a)throw a;let s=r;return r&&e.mergeStatus&&(e.mergeStatus==="merged"?s=r.filter(o=>o.invitation_status==="registered"):e.mergeStatus==="unlinked"?s=r.filter(o=>!o.invitation_status||o.invitation_status==="not_invited"||o.invitation_status==="pending"):s=r.filter(o=>o.invitation_status===e.mergeStatus)),{data:s,error:null}}catch(t){return console.error("Error fetching candidates:",t),{data:null,error:t}}},async exportCandidatesCSV(e){const{data:t,error:r}=await n.from("unified_candidate_view").select("*").in("id",e);if(r||!t)return{data:null,error:r};const a=["Name","Email","Phone","Current Title","Company","Years Experience","Desired Salary Min","Desired Salary Max","Currency","LinkedIn","Created At"],s=t.map(i=>[i.full_name||i.email,i.email,i.phone||"",i.current_title||"",i.current_company||"",i.years_of_experience||"",i.desired_salary_min||"",i.desired_salary_max||"",i.preferred_currency||"",i.linkedin_url?"Yes":"No",i.created_at]);return{data:[a.join(","),...s.map(i=>i.map(d=>`"${d}"`).join(","))].join(`
`),error:null}},async getCandidateSettings(e){const{data:t,error:r}=await n.from("profiles").select(`
        current_salary_min, current_salary_max,
        desired_salary_min, desired_salary_max,
        preferred_currency,
        employment_type_preference,
        freelance_hourly_rate_min, freelance_hourly_rate_max,
        fulltime_hours_per_week_min, fulltime_hours_per_week_max,
        freelance_hours_per_week_min, freelance_hours_per_week_max,
        notice_period, contract_end_date, has_indefinite_contract,
        preferred_work_locations, remote_work_preference,
        resume_url, phone, phone_verified, email_verified,
        stealth_mode_enabled, privacy_settings, public_fields
      `).eq("id",e).single();return{data:t,error:r}},async getUserSettings(e){const{data:t,error:r}=await n.from("profiles").select(`
        *,
        candidate_profiles(
          id,
          resume_url,
          portfolio_url,
          linkedin_url,
          github_url
        )
      `).eq("id",e).single();return{data:t,error:r}},async getMergeStats(){const{data:e,error:t}=await n.from("candidate_profiles").select("invitation_status, profile_completeness");return t||!e?{data:null,error:t}:{data:{total:e.length,merged:e.filter(a=>a.invitation_status==="registered").length,invited:e.filter(a=>a.invitation_status==="invited").length,unlinked:e.filter(a=>!a.invitation_status||a.invitation_status==="pending"||a.invitation_status==="not_invited").length,avgCompleteness:e.length>0?Math.round(e.reduce((a,s)=>a+(s.profile_completeness||0),0)/e.length):0},error:null}},async getRecentMerges(e=10){const{data:t,error:r}=await n.from("candidate_profiles").select("id, full_name, email, merged_at, user_id").not("merged_at","is",null).order("merged_at",{ascending:!1}).limit(e);return{data:t,error:r}},async getStrategists(){try{const{data:e,error:t}=await n.from("user_roles").select("user_id").eq("role","strategist");if(t)return console.error("Error fetching strategist roles:",t),{data:[],error:t};if(!e||e.length===0)return{data:[],error:null};const r=e.map(o=>o.user_id).filter(Boolean);if(r.length===0)return{data:[],error:null};const{data:a,error:s}=await n.from("profiles").select("id, full_name, email, avatar_url, current_title, company_id").in("id",r).order("full_name");return s?(console.error("Error fetching strategist profiles:",s),{data:[],error:s}):{data:a||[],error:null}}catch(e){return console.error("Error fetching strategists:",e),{data:[],error:e}}},async assignStrategist(e,t){const{error:r}=await n.from("candidate_profiles").update({assigned_strategist_id:t}).eq("id",e);return{error:r}},async bulkAssignStrategist(e,t){const{error:r}=await n.from("candidate_profiles").update({assigned_strategist_id:t}).in("id",e);return{error:r}},async bulkSendInvitations(e){const{data:t,error:r}=await n.functions.invoke("send-candidate-invitations",{body:{candidateIds:e}});return{data:t,error:r}},async getArchivedCandidates(){const{data:e,error:t}=await n.from("candidate_profiles").select(`
        *,
        deleted_by_profile:profiles!deleted_by(full_name),
        applications(count)
      `).not("deleted_at","is",null).order("deleted_at",{ascending:!1});return{data:e,error:t}},async restoreCandidate(e,t="Restored from archive"){const{data:{user:r}}=await n.auth.getUser();if(!r)return{error:new Error("Not authenticated")};const{error:a}=await n.from("candidate_profiles").update({deleted_at:null,deleted_by:null,deletion_reason:null,deletion_type:null,deletion_metadata:{}}).eq("id",e);return{error:a}},async getOrphanedApplicationsCount(){const{count:e,error:t}=await n.from("applications").select("*",{count:"exact",head:!0}).is("candidate_id",null);return{count:e,error:t}},async fastTrackCandidate(e){try{const{data:t,error:r}=await n.from("applications").update({current_stage_index:1,metadata:{fast_tracked:!0,fast_tracked_at:new Date().toISOString()}}).eq("id",e).select().single();return{data:t,error:r}}catch(t){return console.error("Error fast tracking candidate:",t),{data:null,error:t}}}};export{_ as a};
