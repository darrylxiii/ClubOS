import fs from 'fs';

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

function checkLegacyStages() {
  const filePath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/jobs.csv';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const rows = customCSVParse(fileContent);
  const headers = rows[0];
  const stageIdx = headers.indexOf('deal_stage');
  const probIdx = headers.indexOf('deal_probability');
  
  let stageMap = {};
  
  for (let i = 1; i < rows.length; i++) {
      if (rows[i].length < 2) continue;
      const stage = rows[i][stageIdx] || '<empty>';
      const prob = rows[i][probIdx] || '<empty>';
      const key = `${stage} (${prob}%)`;
      if (!stageMap[key]) stageMap[key] = 0;
      stageMap[key]++;
  }
  
  console.log("Legacy Deal Stages and Probabilities:");
  console.log(stageMap);
}
checkLegacyStages();
