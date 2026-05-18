import { format, parseISO } from 'date-fns';
import { enUS, fr, es, pt, zhCN, arSA } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { DrinkType, LeakTrigger } from '../types';

const DATE_LOCALES: Record<string, DateFnsLocale> = { en: enUS, fr, es, pt, zh: zhCN, ar: arSA };

export function getDateLocale(locale: string): DateFnsLocale {
  return DATE_LOCALES[locale] || enUS;
}

export interface PdfStrings {
  appName: string;
  reportSubtitle: string;
  startDate: string;
  age: string;
  clinicCode: string;
  generated: string;
  clinicalMetrics: string;
  metric: string;
  night1Day2: string;
  night2Day3: string;
  overall: string;
  nocturnalVol: string;
  totalIntake: string;
  totalOutput: string;
  voidCount: string;
  voidLeakCount: string;
  standaloneLeaks: string;
  continence: string;
  continent: string;
  incontinent: string;
  dailySummary: string;
  fluidIntake: string;
  voidVolume: string;
  drinkCount: string;
  voidLeaks: string;
  wakeTime: string;
  bedtime: string;
  day: (n: number) => string;
  wake: string;
  bed: string;
  fluidIn: string;
  voided: string;
  sens: string;
  leak: string;
  intake: string;
  output: string;
  voids: string;
  leaks: string;
  voidWord: string;
  standaloneWord: string;
  threeDayTitle: string;
  started: string;
  name: string;
  time: string;
  drinks: string;
  urine: string;
  sensationLegend: string;
  clinicalAnalysis: string;
  /** Page-7 schema-comment sub-title under structuredDataTitle. EN-only by convention (see PdfStrings note). */
  structuredDataSubtitle: string;
  dailyFluidBalance: string;
  fluidIntakeLabel: string;
  voidedOutput: string;
  freqVolChart: string;
  freqVolDesc: string;
  voidLeakLegend: string;
  standaloneLeakLegend: string;
  urgencyDistribution: string;
  notRecorded: string;
  footerTagline: string;
  footerDisclaimer: string;
  page: (n: number, total: number) => string;
  yes: string;
  morningPee: string;
  doubleVoid: string;
  sensLabels: Record<number, string>;
  drinkLabels: Record<string, string>;
  leakTriggerLabels: Record<string, string>;
  /** Header for the page-7 machine-readable data section. EN-only by convention but emitted via the strings table for completeness. */
  structuredDataTitle: string;
  /** Inline header above the events table on page 7. */
  eventsTitle: string;
}

const PDF_STRINGS: Record<string, PdfStrings> = {
  en: {
    appName: 'My Flow Check',
    reportSubtitle: '3-Day Bladder Diary Report',
    startDate: 'Start date',
    age: 'Age',
    clinicCode: 'Clinic code',
    generated: 'Generated',
    clinicalMetrics: 'Clinical Metrics',
    metric: 'Metric',
    night1Day2: 'Night 1 / Day 2',
    night2Day3: 'Night 2 / Day 3',
    overall: 'Overall',
    nocturnalVol: 'Nocturnal Vol',
    totalIntake: 'Total Intake',
    totalOutput: 'Total Output',
    voidCount: 'Void Count',
    voidLeakCount: 'Void Leak Count',
    standaloneLeaks: 'Standalone Leaks',
    continence: 'Continence',
    continent: 'Continent',
    incontinent: 'Incontinent',
    dailySummary: 'Daily Summary',
    fluidIntake: 'Fluid Intake',
    voidVolume: 'Void Volume',
    drinkCount: 'Drink Count',
    voidLeaks: 'Void Leaks',
    wakeTime: 'Wake Time',
    bedtime: 'Bedtime',
    day: (n) => `Day ${n}`,
    wake: 'Wake',
    bed: 'Bed',
    fluidIn: 'Fluid In',
    voided: 'Voided',
    sens: 'Sens',
    leak: 'Leak',
    intake: 'Intake',
    output: 'Output',
    voids: 'voids',
    leaks: 'Leaks',
    voidWord: 'void',
    standaloneWord: 'standalone',
    threeDayTitle: '3-Day Bladder Diary',
    started: 'Started',
    name: 'Name',
    time: 'TIME',
    drinks: 'Drinks',
    urine: 'Urine',
    sensationLegend: 'Bladder sensation codes:  0 = No urge (went just in case)  |  1 = Mild (normal desire)  |  2 = Moderate (urgency, but passed)  |  3 = Strong (barely made it)  |  4 = Leaked (couldn\'t make it)',
    clinicalAnalysis: 'Clinical Analysis',
    structuredDataSubtitle: 'For clinical software ingestion. This page may be scanned or parsed electronically.',
    dailyFluidBalance: 'Daily Fluid Balance',
    fluidIntakeLabel: 'Fluid Intake',
    voidedOutput: 'Voided Output',
    freqVolChart: 'Frequency-Volume Chart',
    freqVolDesc: 'Each dot = one void, positioned by time of day. Red circle = leak. Dashed line = MVV.',
    voidLeakLegend: '= Void leak',
    standaloneLeakLegend: '= Standalone leak',
    urgencyDistribution: 'Urgency Distribution',
    notRecorded: 'Not recorded',
    footerTagline: 'IPC — Integrated Pelvic Care believes that better data leads to better care.',
    footerDisclaimer: 'This report is for informational purposes only and does not replace medical advice. Always consult your health professional.',
    page: (n, total) => `Page ${n} / ${total}`,
    yes: 'Yes',
    morningPee: 'FMV',
    doubleVoid: 'DV',
    sensLabels: { 0: 'No urge', 1: 'Mild', 2: 'Moderate', 3: 'Strong', 4: 'Leaked' },
    drinkLabels: { water: 'Water', coffee: 'Coffee', tea: 'Tea', juice: 'Juice', carbonated: 'Soda', alcohol: 'Alcohol', milk: 'Milk', other: 'Other' },
    leakTriggerLabels: { cough: 'Coughing', sneeze: 'Sneezing', laugh: 'Laughing', lifting: 'Lifting', exercise: 'Exercise', toilet_way: 'On the way', other: 'Other', not_sure: 'Not sure' },
    structuredDataTitle: 'Structured Data',
    eventsTitle: 'Events',
  },
  fr: {
    appName: 'My Flow Check',
    reportSubtitle: 'Journal urinaire de 3 jours',
    startDate: 'Date de début',
    age: 'Âge',
    clinicCode: 'Code clinique',
    generated: 'Généré le',
    clinicalMetrics: 'Mesures cliniques',
    metric: 'Mesure',
    night1Day2: 'Nuit 1 / Jour 2',
    night2Day3: 'Nuit 2 / Jour 3',
    overall: 'Total',
    nocturnalVol: 'Vol. nocturne',
    totalIntake: 'Apport total',
    totalOutput: 'Volume total',
    voidCount: 'Nb de mictions',
    voidLeakCount: 'Escapes lors de miction',
    standaloneLeaks: 'Escapes isolés',
    continence: 'Continence',
    continent: 'Continent',
    incontinent: 'Incontinent',
    dailySummary: 'Résumé quotidien',
    fluidIntake: 'Apport liquidien',
    voidVolume: 'Volume uriné',
    drinkCount: 'Nb de boissons',
    voidLeaks: 'Escapes lors de miction',
    wakeTime: 'Réveil',
    bedtime: 'Coucher',
    day: (n) => `Jour ${n}`,
    wake: 'Réveil',
    bed: 'Coucher',
    fluidIn: 'Boissons',
    voided: 'Uriné',
    sens: 'Envie',
    leak: 'Escape',
    intake: 'Apport',
    output: 'Uriné',
    voids: 'mictions',
    leaks: 'Escapes',
    voidWord: 'miction',
    standaloneWord: 'isolé',
    threeDayTitle: 'Journal urinaire de 3 jours',
    started: 'Début',
    name: 'Nom',
    time: 'HEURE',
    drinks: 'Boissons',
    urine: 'Urine',
    sensationLegend: 'Codes d\'envie :  0 = Aucune envie (précaution)  |  1 = Légère (normale)  |  2 = Modérée (envie passée)  |  3 = Forte (de justesse)  |  4 = Escape (pas eu le temps)',
    clinicalAnalysis: 'Analyse clinique',
    structuredDataSubtitle: 'Pour l\'intégration logicielle clinique. Cette page peut être numérisée ou analysée électroniquement.',
    dailyFluidBalance: 'Bilan liquidien quotidien',
    fluidIntakeLabel: 'Apport liquidien',
    voidedOutput: 'Volume uriné',
    freqVolChart: 'Graphique fréquence-volume',
    freqVolDesc: 'Chaque point = une miction, positionnée par heure. Cercle rouge = escape. Ligne pointillée = VMM.',
    voidLeakLegend: '= Escape lors de miction',
    standaloneLeakLegend: '= Escape isolé',
    urgencyDistribution: 'Distribution de l\'envie',
    notRecorded: 'Non enregistré',
    footerTagline: 'IPC — Integrated Pelvic Care croit que de meilleures données mènent à de meilleurs soins.',
    footerDisclaimer: 'Ce rapport est fourni à titre informatif et ne remplace pas un avis médical. Consultez toujours votre professionnel de santé.',
    page: (n, total) => `Page ${n} / ${total}`,
    yes: 'Oui',
    morningPee: 'PMU',
    doubleVoid: 'DV',
    sensLabels: { 0: 'Aucune envie', 1: 'Légère', 2: 'Modérée', 3: 'Forte', 4: 'Escape' },
    drinkLabels: { water: 'Eau', coffee: 'Café', tea: 'Thé', juice: 'Jus', carbonated: 'Boisson gazeuse', alcohol: 'Alcool', milk: 'Lait', other: 'Autre' },
    leakTriggerLabels: { cough: 'Toux', sneeze: 'Éternuement', laugh: 'Rire', lifting: 'Port de charge', exercise: 'Exercice', toilet_way: 'En chemin', other: 'Autre', not_sure: 'Pas sûr' },
    structuredDataTitle: 'Données structurées',
    eventsTitle: 'Événements',
  },
  es: {
    appName: 'My Flow Check',
    reportSubtitle: 'Diario urinario de 3 días',
    startDate: 'Fecha de inicio',
    age: 'Edad',
    clinicCode: 'Código de clínica',
    generated: 'Generado el',
    clinicalMetrics: 'Medidas clínicas',
    metric: 'Medida',
    night1Day2: 'Noche 1 / Día 2',
    night2Day3: 'Noche 2 / Día 3',
    overall: 'Total',
    nocturnalVol: 'Vol. nocturno',
    totalIntake: 'Ingesta total',
    totalOutput: 'Volumen total',
    voidCount: 'N.º de micciones',
    voidLeakCount: 'Escapes al orinar',
    standaloneLeaks: 'Escapes aislados',
    continence: 'Continencia',
    continent: 'Continente',
    incontinent: 'Incontinente',
    dailySummary: 'Resumen diario',
    fluidIntake: 'Ingesta de líquidos',
    voidVolume: 'Volumen orinado',
    drinkCount: 'N.º de bebidas',
    voidLeaks: 'Escapes al orinar',
    wakeTime: 'Despertar',
    bedtime: 'Acostarse',
    day: (n) => `Día ${n}`,
    wake: 'Despertar',
    bed: 'Acostarse',
    fluidIn: 'Bebidas',
    voided: 'Orinado',
    sens: 'Ganas',
    leak: 'Escape',
    intake: 'Ingesta',
    output: 'Orinado',
    voids: 'micciones',
    leaks: 'Escapes',
    voidWord: 'micción',
    standaloneWord: 'aislado',
    threeDayTitle: 'Diario urinario de 3 días',
    started: 'Inicio',
    name: 'Nombre',
    time: 'HORA',
    drinks: 'Bebidas',
    urine: 'Orina',
    sensationLegend: 'Códigos de ganas:  0 = Sin ganas (por precaución)  |  1 = Leve (normal)  |  2 = Moderada (ganas pasaron)  |  3 = Fuerte (por poco)  |  4 = Escape (no llegó a tiempo)',
    clinicalAnalysis: 'Análisis clínico',
    structuredDataSubtitle: 'Para la ingesta por software clínico. Esta página puede escanearse o analizarse electrónicamente.',
    dailyFluidBalance: 'Balance de líquidos diario',
    fluidIntakeLabel: 'Ingesta de líquidos',
    voidedOutput: 'Volumen orinado',
    freqVolChart: 'Gráfico frecuencia-volumen',
    freqVolDesc: 'Cada punto = una micción, posicionada por hora. Círculo rojo = escape. Línea punteada = VMM.',
    voidLeakLegend: '= Escape al orinar',
    standaloneLeakLegend: '= Escape aislado',
    urgencyDistribution: 'Distribución de ganas',
    notRecorded: 'No registrado',
    footerTagline: 'IPC — Integrated Pelvic Care cree que mejores datos llevan a mejor atención.',
    footerDisclaimer: 'Este informe es solo informativo y no reemplaza el consejo médico. Consulte siempre a su profesional de salud.',
    page: (n, total) => `Página ${n} / ${total}`,
    yes: 'Sí',
    morningPee: 'PMO',
    doubleVoid: 'DV',
    sensLabels: { 0: 'Sin ganas', 1: 'Leve', 2: 'Moderada', 3: 'Fuerte', 4: 'Escape' },
    drinkLabels: { water: 'Agua', coffee: 'Café', tea: 'Té', juice: 'Jugo', carbonated: 'Refresco', alcohol: 'Alcohol', milk: 'Leche', other: 'Otro' },
    leakTriggerLabels: { cough: 'Tos', sneeze: 'Estornudo', laugh: 'Risa', lifting: 'Levantar peso', exercise: 'Ejercicio', toilet_way: 'De camino', other: 'Otro', not_sure: 'No sé' },
    structuredDataTitle: 'Datos estructurados',
    eventsTitle: 'Eventos',
  },
  pt: {
    appName: 'My Flow Check',
    reportSubtitle: 'Diário miccional de 3 dias',
    startDate: 'Data de início',
    age: 'Idade',
    clinicCode: 'Código clínico',
    generated: 'Gerado em',
    clinicalMetrics: 'Medidas clínicas',
    metric: 'Medida',
    night1Day2: 'Noite 1 / Dia 2',
    night2Day3: 'Noite 2 / Dia 3',
    overall: 'Total',
    nocturnalVol: 'Vol. noturno',
    totalIntake: 'Ingestão total',
    totalOutput: 'Volume total',
    voidCount: 'N.º de micções',
    voidLeakCount: 'Perdas durante micção',
    standaloneLeaks: 'Perdas isoladas',
    continence: 'Continência',
    continent: 'Continente',
    incontinent: 'Incontinente',
    dailySummary: 'Resumo diário',
    fluidIntake: 'Ingestão de líquidos',
    voidVolume: 'Volume urinado',
    drinkCount: 'N.º de bebidas',
    voidLeaks: 'Perdas durante micção',
    wakeTime: 'Despertar',
    bedtime: 'Deitar',
    day: (n) => `Dia ${n}`,
    wake: 'Despertar',
    bed: 'Deitar',
    fluidIn: 'Bebidas',
    voided: 'Urinado',
    sens: 'Vontade',
    leak: 'Perda',
    intake: 'Ingestão',
    output: 'Urinado',
    voids: 'micções',
    leaks: 'Perdas',
    voidWord: 'micção',
    standaloneWord: 'isolada',
    threeDayTitle: 'Diário miccional de 3 dias',
    started: 'Início',
    name: 'Nome',
    time: 'HORA',
    drinks: 'Bebidas',
    urine: 'Urina',
    sensationLegend: 'Códigos de vontade:  0 = Sem vontade (precaução)  |  1 = Leve (normal)  |  2 = Moderada (vontade passou)  |  3 = Forte (por pouco)  |  4 = Perda (não chegou a tempo)',
    clinicalAnalysis: 'Análise clínica',
    structuredDataSubtitle: 'Para ingestão por software clínico. Esta página pode ser digitalizada ou analisada eletronicamente.',
    dailyFluidBalance: 'Balanço diário de líquidos',
    fluidIntakeLabel: 'Ingestão de líquidos',
    voidedOutput: 'Volume urinado',
    freqVolChart: 'Gráfico frequência-volume',
    freqVolDesc: 'Cada ponto = uma micção, posicionada pela hora. Círculo vermelho = perda. Linha pontilhada = VMM.',
    voidLeakLegend: '= Perda durante micção',
    standaloneLeakLegend: '= Perda isolada',
    urgencyDistribution: 'Distribuição da vontade',
    notRecorded: 'Não registado',
    footerTagline: 'IPC, Integrated Pelvic Care, acredita que melhores dados levam a melhores cuidados.',
    footerDisclaimer: 'Este relatório é apenas informativo e não substitui o aconselhamento médico. Consulte sempre o seu profissional de saúde.',
    page: (n, total) => `Página ${n} / ${total}`,
    yes: 'Sim',
    morningPee: 'PMU',
    doubleVoid: 'DV',
    sensLabels: { 0: 'Sem vontade', 1: 'Leve', 2: 'Moderada', 3: 'Forte', 4: 'Perda' },
    drinkLabels: { water: 'Água', coffee: 'Café', tea: 'Chá', juice: 'Sumo', carbonated: 'Refrigerante', alcohol: 'Álcool', milk: 'Leite', other: 'Outro' },
    leakTriggerLabels: { cough: 'Tosse', sneeze: 'Espirro', laugh: 'Riso', lifting: 'Levantar peso', exercise: 'Exercício', toilet_way: 'A caminho', other: 'Outro', not_sure: 'Não sei' },
    structuredDataTitle: 'Dados estruturados',
    eventsTitle: 'Eventos',
  },
  zh: {
    appName: 'My Flow Check',
    reportSubtitle: '3天排尿日记报告',
    startDate: '开始日期',
    age: '年龄',
    clinicCode: '诊所编号',
    generated: '生成于',
    clinicalMetrics: '临床指标',
    metric: '指标',
    night1Day2: '夜1 / 日2',
    night2Day3: '夜2 / 日3',
    overall: '总计',
    nocturnalVol: '夜尿量',
    totalIntake: '总摄入',
    totalOutput: '总排尿',
    voidCount: '排尿次数',
    voidLeakCount: '排尿时漏尿',
    standaloneLeaks: '独立漏尿',
    continence: '控尿',
    continent: '控尿',
    incontinent: '失禁',
    dailySummary: '每日小结',
    fluidIntake: '液体摄入',
    voidVolume: '排尿量',
    drinkCount: '饮水次数',
    voidLeaks: '排尿时漏尿',
    wakeTime: '起床时间',
    bedtime: '就寝时间',
    day: (n) => `第${n}天`,
    wake: '起床',
    bed: '就寝',
    fluidIn: '饮水',
    voided: '排尿',
    sens: '尿感',
    leak: '漏尿',
    intake: '摄入',
    output: '排尿',
    voids: '次排尿',
    leaks: '漏尿',
    voidWord: '排尿',
    standaloneWord: '独立',
    threeDayTitle: '3天排尿日记',
    started: '开始',
    name: '姓名',
    time: '时间',
    drinks: '饮水',
    urine: '尿液',
    sensationLegend: '尿感分级: 0 = 无尿意(预防性如厕) | 1 = 轻度(正常) | 2 = 中度(尿意已过) | 3 = 强烈(差点没忍住) | 4 = 漏尿(没忍住)',
    clinicalAnalysis: '临床分析',
    structuredDataSubtitle: '供临床软件读取。本页可被扫描或电子解析。',
    dailyFluidBalance: '每日液体平衡',
    fluidIntakeLabel: '液体摄入',
    voidedOutput: '排尿量',
    freqVolChart: '频率-容量图',
    freqVolDesc: '每个点 = 一次排尿,按时间排列。红圈 = 漏尿。虚线 = 最大排尿量 (MVV)。',
    voidLeakLegend: '= 排尿时漏尿',
    standaloneLeakLegend: '= 独立漏尿',
    urgencyDistribution: '尿感分布',
    notRecorded: '未记录',
    footerTagline: 'IPC (整合盆腔照护) 相信,更好的数据带来更好的照护。',
    footerDisclaimer: '本报告仅供参考,不能替代医学建议。请始终咨询你的医疗专业人员。',
    page: (n, total) => `第 ${n} 页 / 共 ${total} 页`,
    yes: '是',
    morningPee: 'FMV',
    doubleVoid: 'DV',
    sensLabels: { 0: '无尿意', 1: '轻度', 2: '中度', 3: '强烈', 4: '漏尿' },
    drinkLabels: { water: '水', coffee: '咖啡', tea: '茶', juice: '果汁', carbonated: '碳酸饮料', alcohol: '酒精', milk: '牛奶', other: '其他' },
    leakTriggerLabels: { cough: '咳嗽', sneeze: '打喷嚏', laugh: '笑', lifting: '提重物', exercise: '运动', toilet_way: '途中', other: '其他', not_sure: '不确定' },
    structuredDataTitle: '结构化数据',
    eventsTitle: '事件',
  },
  ar: {
    appName: 'My Flow Check',
    reportSubtitle: 'تقرير يوميات المثانة لثلاثة أيام',
    startDate: 'تاريخ البدء',
    age: 'العمر',
    clinicCode: 'رمز العيادة',
    generated: 'تم الإنشاء في',
    clinicalMetrics: 'القياسات السريرية',
    metric: 'القياس',
    night1Day2: 'الليلة 1 / اليوم 2',
    night2Day3: 'الليلة 2 / اليوم 3',
    overall: 'الإجمالي',
    nocturnalVol: 'الحجم الليلي',
    totalIntake: 'إجمالي السوائل',
    totalOutput: 'إجمالي الإخراج',
    voidCount: 'عدد مرات التبول',
    voidLeakCount: 'تسرب أثناء التبول',
    standaloneLeaks: 'تسرب منفصل',
    continence: 'التحكم',
    continent: 'يتحكم',
    incontinent: 'سلس',
    dailySummary: 'الملخص اليومي',
    fluidIntake: 'كمية السوائل',
    voidVolume: 'حجم البول',
    drinkCount: 'عدد المشروبات',
    voidLeaks: 'تسرب أثناء التبول',
    wakeTime: 'وقت الاستيقاظ',
    bedtime: 'وقت النوم',
    day: (n) => `اليوم ${n}`,
    wake: 'استيقاظ',
    bed: 'نوم',
    fluidIn: 'السوائل',
    voided: 'بول',
    sens: 'الإلحاح',
    leak: 'تسرب',
    intake: 'الإدخال',
    output: 'الإخراج',
    voids: 'مرات تبول',
    leaks: 'تسربات',
    voidWord: 'تبول',
    standaloneWord: 'منفصل',
    threeDayTitle: 'يوميات المثانة لثلاثة أيام',
    started: 'بدأ',
    name: 'الاسم',
    time: 'الوقت',
    drinks: 'مشروبات',
    urine: 'بول',
    sensationLegend: 'رموز الإلحاح: 0 = لا إلحاح (وقاية) | 1 = خفيف (طبيعي) | 2 = متوسط (زال الإلحاح) | 3 = قوي (وصلت بصعوبة) | 4 = تسرب (لم أتمكن)',
    clinicalAnalysis: 'التحليل السريري',
    structuredDataSubtitle: 'لاستخدام البرامج السريرية. يمكن مسح هذه الصفحة أو تحليلها إلكترونياً.',
    dailyFluidBalance: 'التوازن اليومي للسوائل',
    fluidIntakeLabel: 'كمية السوائل',
    voidedOutput: 'حجم البول',
    freqVolChart: 'مخطط التكرار والحجم',
    freqVolDesc: 'كل نقطة = مرة تبول, حسب الوقت. الدائرة الحمراء = تسرب. الخط المتقطع = الحجم الأقصى للتبول.',
    voidLeakLegend: '= تسرب أثناء التبول',
    standaloneLeakLegend: '= تسرب منفصل',
    urgencyDistribution: 'توزيع الإلحاح',
    notRecorded: 'غير مسجل',
    footerTagline: 'IPC تؤمن بأن البيانات الأفضل تؤدي إلى رعاية أفضل.',
    footerDisclaimer: 'هذا التقرير لأغراض إعلامية فقط ولا يحل محل المشورة الطبية. استشر دائماً مختص الرعاية الصحية.',
    page: (n, total) => `صفحة ${n} / ${total}`,
    yes: 'نعم',
    morningPee: 'FMV',
    doubleVoid: 'DV',
    sensLabels: { 0: 'لا إلحاح', 1: 'خفيف', 2: 'متوسط', 3: 'قوي', 4: 'تسرب' },
    drinkLabels: { water: 'ماء', coffee: 'قهوة', tea: 'شاي', juice: 'عصير', carbonated: 'مشروب غازي', alcohol: 'كحول', milk: 'حليب', other: 'أخرى' },
    leakTriggerLabels: { cough: 'سعال', sneeze: 'عطس', laugh: 'ضحك', lifting: 'حمل ثقيل', exercise: 'تمرين', toilet_way: 'في الطريق', other: 'أخرى', not_sure: 'لست متأكداً' },
    structuredDataTitle: 'بيانات منظمة',
    eventsTitle: 'الأحداث',
  },
};

export function getPdfStrings(locale: string): PdfStrings {
  return PDF_STRINGS[locale] || PDF_STRINGS.en;
}

/** Get translated drink label for PDF. */
export function pdfDrinkLabel(type: DrinkType, locale: string): string {
  const s = getPdfStrings(locale);
  return s.drinkLabels[type] ?? getPdfStrings('en').drinkLabels[type] ?? 'Other';
}

/** Get translated leak trigger label for PDF. */
export function pdfLeakTriggerLabel(trigger: LeakTrigger, locale: string): string {
  const s = getPdfStrings(locale);
  return s.leakTriggerLabels[trigger] ?? getPdfStrings('en').leakTriggerLabels[trigger] ?? 'Other';
}

/** Format a date string for human-readable PDF pages using the correct locale. */
export function pdfFormatDate(isoString: string, pattern: string, locale: string): string {
  return format(parseISO(isoString), pattern, { locale: getDateLocale(locale) });
}
