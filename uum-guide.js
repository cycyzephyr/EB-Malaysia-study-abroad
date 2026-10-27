// UUM-wide admission rules are kept separate from programme-specific requirements.
(() => {
  const undergraduate = 'https://www.uum.edu.my/admissions/application-guidelines/undergraduate-international';
  const postgraduate = 'https://www.uum.edu.my/admissions/application-guidelines/postgraduate';
  const handbook = 'https://oyagsb.uum.edu.my/images/2026/pg_handbook_update/PG%20HANDBOOK%20EDISI%202026%201.pdf';
  const fees = 'https://www.uum.edu.my/admissions/fees/postgraduate';
  const item = (title, text, url) => ({ title, text, url });
  function academic(row) {
    const name = row.programme_name || '';
    if (row.degree_level === 'Bachelor') return item('本科校级学历条件', '完成小学至高中阶段合计至少11–12年学习，持UUM认可的高中或同等学历；申请者还须在数学（或同等科目）和英语取得合格成绩，并在申请截止前满18岁、不超过25岁。部分证书或专业可能有额外要求；达到最低条件不保证录取。', undergraduate);
    if (row.degree_level === 'Postgraduate Diploma') return item('研究生文凭申请', '研究生文凭列于UUM研究生招生目录；具体前置学历、专业背景与学分要求请以该文凭的项目页面及研究生院审核为准。', postgraduate);
    if (name === 'Doctor of Business Administration (DBA)') return item('DBA 学历与经验', '2026研究生手册列出相关领域硕士及至少5年相关工作经验的申请路径；亦有35岁及以上、本科学历并通过 APEL 8 的路径，学校按个案审核。', handbook);
    if (name === 'Doctor of Management') return item('管理学博士学历与经验', '2026研究生手册要求担任高级职位；常规路径为相关硕士及至少5年与研究课题相关的工作经验。手册另列本科学历及研究型硕士转入路径。', handbook);
    if (name === 'Master of Business Administration') return item('MBA 专业入学条件', '2026研究生手册：相关领域学士 CGPA 至少2.75，并具至少3年相关工作经验；CGPA低于2.75者凭至少5年相关经验，可经研究生委员会面试评估。另有 APEL 7 等路径。', handbook);
    if (name === 'Master of Business Management') return item('MBM 专业入学条件', '2026研究生手册：相关领域学士通常须 CGPA 至少2.75；另有符合年资、年龄与 APEL 7 条件的路径及学校认可的同等学历路径。', handbook);
    if (row.degree_level === 'Doctorate') return item('博士校级学历条件', '2026研究生手册以相关领域硕士为主要申请路径；商学院研究生院及商学院研究生部的 PhD 对有 CGPA 的硕士学历通常要求至少3.00。手册亦列优秀本科毕业生、研究型硕士转入等特别路径，具体按学院和专业审核。', handbook);
    if (row.degree_level === 'Master') {
      const types = row.programme_types || [row.programme_type];
      if (types.includes('Research') && types.length === 1) return item('研究型硕士校级学历条件', '2026研究生手册：相关领域荣誉学士通常须 CGPA 至少2.75；CGPA 2.50–2.74 可凭至少3年相关工作经验，经研究生委员会面试评估。另有同等学历与先修课程路径。', handbook);
      if (types.includes('Mixed Mode') && !types.includes('Coursework')) return item('混合型硕士校级学历条件', '2026研究生手册：相关领域荣誉学士通常须 CGPA 至少2.75；CGPA 2.50–2.74 加至少3年相关工作经验，或 CGPA 2.00–2.49 加至少5年相关工作经验，均须经研究生委员会面试评估。', handbook);
      if (types.includes('Research') || types.includes('Mixed Mode')) return item('硕士校级学历条件', '该项目有多种培养模式。2026研究生手册按模式分别设门槛：授课型相关学士通常 CGPA 至少2.50；研究型或混合型通常至少2.75。较低 CGPA 可通过规定的相关工作经验等路径申请。', handbook);
      return item('授课型硕士校级学历条件', '2026研究生手册：相关领域荣誉学士通常须 CGPA 至少2.50；CGPA 2.00–2.49 加至少3年相关工作经验者可经研究生委员会面试评估。另列先修课程及 APEL 7 等路径。', handbook);
    }
    return null;
  }
  function english(row) {
    if (row.fee_source_kind === 'supplied_chart') return item('本科图表雅思参考', row.language_requirement_cn, row.fee_source_url);
    if (row.degree_level === 'Bachelor') return item('本科校级英语条件', '英语水平须达到所申请专业设定的要求；官网也列有认可英语授课学历或英语证书的路径。尚未满足英语条件者可先修强化英语课程，随后取得规定的 MUET 成绩；具体分数以专业和学校审核为准。', undergraduate);
    if (/OYAGSB/.test(row.faculty || '') || ['Master of Business Administration','Master of Business Management'].includes(row.programme_name)) return item('商学院研究生院英语条件', '2026研究生手册规定，OYAGSB 学生须按免修学术英语的条件申请，例如 IELTS 6.0、TOEFL iBT 60、MUET Band 4 或 PTE 59；符合手册列明的英语授课学历豁免条件者可走相应路径。未达标者可先修英语预备课程。', handbook);
    return item('研究生校级英语条件', '2026研究生手册：国际生 IELTS 5.5、TOEFL iBT 46–59 或 PTE 51–58 等成绩可走入学路径，但须修读 SCLE4186 学术英语强化课；IELTS 6.0、TOEFL iBT 60、MUET Band 4 或 PTE 59 等可免修该课。认可的英语授课学历也可能豁免。商学院研究生院及专业附加条件须另按项目核对。', handbook);
  }
  function costs(row) {
    if (row.fee_source_kind === 'supplied_chart') return item('本科图表参考学费', row.tuition_fee_requirement_cn, row.fee_source_url);
    const brochure=(row.sources?.fee||[]).find(url=>url.includes('uumkl.uum.edu.my/')&&url.endsWith('.pdf'));
    if (brochure) return item('UUMKL 国际生费用', row.tuition_fee_requirement_cn || row.summaries?.fee || '', brochure);
    const feeSheet=(row.sources?.fee||[]).find(url=>url.includes('oyagsb.uum.edu.my/')&&url.endsWith('.pdf'));
    if (feeSheet) return item('UUM Sintok 国际生费用', row.tuition_fee_requirement_cn || row.summaries?.fee || '', feeSheet);
    if (row.degree_level === 'Bachelor') return item('国际生本科费用', 'UUM本科国际生招生页设有注册费与学费表下载入口。当前目录尚未取得该专业可核实的国际生全程学费，详情请通过官方收费入口核对。', undergraduate);
    if (row.programme_name === 'Doctor of Management') return item('管理学博士国际生费用', 'UUM研究生收费表未列出该项目可核实的国际生学费。全校研究生国际生注册 RM750、体检 RM200、管理费 RM2,000，合计 RM2,950；另按校区收取每学期服务费：Sintok RM750、吉隆坡校区及其他中心 RM540。住宿等另计，国际生学生费用自2025年9月起适用6%服务税。具体项目费用须向学院索取。', handbook);
    if (row.degree_level === 'Master' && row.summaries?.fee) return item('国际生计费标准与附加费用', row.summaries.fee + ' 国际生注册RM750、体检RM200、管理费RM2,000，合计RM2,950；每学期服务费Sintok为RM750、吉隆坡校区及其他中心为RM540。', fees);
    return item('研究生附加费用', 'UUM研究生收费表另列国际生注册 RM750、体检 RM200、管理费 RM2,000，合计 RM2,950。2026手册列每学期服务费：Sintok RM750、吉隆坡校区及其他中心 RM540；住宿、论文答辩和先修课程等另计。国际生学生费用自2025年9月起适用6%服务税。该专业的国际生费用合计请向学院核对。', handbook);
  }
  function quickFacts(row) {
    if (row.fee_source_kind === 'supplied_chart') return [['语言', `IELTS ${row.ielts_min.toFixed(1)}`], ['学制', row.duration_card_cn], ['入学月份', '3月、10月']];
    const bachelor = row.degree_level === 'Bachelor';
    const academic = bachelor ? '中小学11–12年；数英合格' : row.programme_name === 'Doctor of Business Administration (DBA)' ? '相关硕士＋5年经验' : row.programme_name === 'Doctor of Management' ? '相关硕士＋5年经验' : row.programme_name === 'Doctor of Education (Ed.D.)' ? '相关硕士 CGPA≥3.00' : row.degree_level === 'Doctorate' ? '相关硕士' : row.programme_name === 'Master of Business Administration' ? 'CGPA≥2.75＋3年经验' : row.programme_name === 'Master of Business Management' ? '相关学士 CGPA≥2.75' : row.degree_level === 'Master' ? row.programme_types?.length > 1 ? '按模式 CGPA≥2.50/2.75' : row.programme_type === 'Coursework' ? '相关学士 CGPA≥2.50' : '相关学士 CGPA≥2.75' : '依项目要求';
    const english = bachelor ? '专业标准／认可英语证书' : /OYAGSB/.test(row.faculty || '') || ['Master of Business Administration','Master of Business Management'].includes(row.programme_name) ? 'IELTS 6.0起' : 'IELTS 5.5＋学术英语课';
    const duration = row.duration_card_cn || row.duration_requirement_cn || '';
    const third = row.course_preview_cn ? ['课程示例', row.course_preview_cn.split('、')[0]] : duration.endsWith('学分') ? ['毕业学分', duration.replace('学分', '')] : duration ? ['全日制学制', duration.split('；')[0].replace(/^全日制/, '').replace(/最短(\d+)年、最长(\d+)年/, '$1–$2年')] : bachelor ? ['申请年龄', '18–25岁'] : ['校历学期', '9月、2月'];
    return [['语言', english], ['学术', academic], third];
  }
  window.UUMGuide = { academic, english, costs, quickFacts };
})();
