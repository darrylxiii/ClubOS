import{s as i}from"./index-T2VZWyPA.js";import{u as n}from"./supabaseRpc-D_zFDlqH.js";const l={async logAudit(a){const{data:{user:t}}=await i.auth.getUser();if(!t)throw new Error("Not authenticated");const{error:e}=await n("candidate_profile_audit").insert({...a,performed_by:t.id});return{error:e}},async getCandidateAuditHistory(a){const{data:t,error:e}=await n("candidate_profile_audit").select(`
        *,
        performed_by_profile:profiles!performed_by(full_name, avatar_url)
      `).eq("candidate_id",a).order("performed_at",{ascending:!1});return{data:t,error:e}},async getDeletionImpact(a){const{data:t,error:e}=await i.from("applications").select(`
        id,
        status,
        job_id,
        jobs(title)
      `).eq("candidate_id",a);return e?{data:null,error:e}:t?{data:{total_applications:t.length,active_applications:t.filter(r=>r.status==="active").length,rejected_applications:t.filter(r=>r.status==="rejected").length,hired_applications:t.filter(r=>r.status==="hired").length,affected_jobs:[...new Set(t.map(r=>r.jobs?.title).filter(Boolean))]},error:null}:{data:null,error:null}},getChangedFields(a,t){return!a||!t?[]:Object.keys(t).filter(e=>JSON.stringify(a[e])!==JSON.stringify(t[e]))}};export{l as c};
