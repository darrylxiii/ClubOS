import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function customCSVParse(fileContent) {
    let rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < fileContent.length; i++) {
        let char = fileContent[i];
        let nextChar = fileContent[i+1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { currentRow.push(currentField); currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') { i++; }
            currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = '';
        } else { currentField += char; }
    }
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField); rows.push(currentRow);
    }
    return rows;
}

async function fixDesync() {
  const filePath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/jobs.csv';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const rows = customCSVParse(fileContent);
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const stageIdx = headers.indexOf('deal_stage');
  const probIdx = headers.indexOf('deal_probability');
  
  let success = 0;
  
  for (let i = 1; i < rows.length; i++) {
      if (rows[i].length < 2) continue;
      const id = rows[i][idIdx];
      let stage = rows[i][stageIdx];
      let prob = rows[i][probIdx];
      
      if (!id || !stage) continue;
      
      const probValue = prob ? parseFloat(prob) : 10;
      
      const { error } = await supabase.from('jobs').update({
          deal_stage: stage,
          deal_probability: probValue
      }).eq('id', id);
      
      if (!error) success++;
  }
  
  console.log(`Restored exact string legacy deal stages and probabilities for ${success} jobs.`);
}

fixDesync().catch(console.error);
