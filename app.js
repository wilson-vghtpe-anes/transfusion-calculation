const STORAGE_VERSION = 1;
const STORAGE_KEY = "transfusion-calculation-state-v1";
const DEFAULT_CASE_NAME = "病人";

const CASE_DEFAULTS = {
  caseName: `${DEFAULT_CASE_NAME} 1`,
  sex: "male",
  heightCm: 170,
  weightKg: 70,
  surgeryLevel: "4",
  customInsensible: 4,
  latestHb: 10,
  targetHb: 8,
  bloodLossMl: 800,
  urineOutputMl: 300,
  prbcUnits: 0,
  ffpUnits: 0,
  crystalloidGivenMl: 0,
  prbcUnitVolumeMl: 200,
  prbcHbGramsPerUnit: 50,
  ffpUnitVolumeMl: 100,
  manualBloodVolumeMl: 0,
  bloodReplacementRatio: 1,
  crystalloidRetentionFraction: 0.25,
  startTime: ""
};

const FIELD_IDS = [
  "caseName",
  "sex",
  "heightCm",
  "weightKg",
  "startTime",
  "surgeryLevel",
  "customInsensible",
  "latestHb",
  "targetHb",
  "bloodLossMl",
  "urineOutputMl",
  "prbcUnits",
  "ffpUnits",
  "crystalloidGivenMl",
  "prbcUnitVolumeMl",
  "prbcHbGramsPerUnit",
  "ffpUnitVolumeMl",
  "manualBloodVolumeMl",
  "bloodReplacementRatio",
  "crystalloidRetentionFraction"
];

const elements = {
  addCaseButton: document.getElementById("addCaseButton"),
  caseTabs: document.getElementById("caseTabs"),
  caseName: document.getElementById("caseName"),
  sex: document.getElementById("sex"),
  heightCm: document.getElementById("heightCm"),
  weightKg: document.getElementById("weightKg"),
  startTime: document.getElementById("startTime"),
  currentTimeDisplay: document.getElementById("currentTimeDisplay"),
  durationDisplay: document.getElementById("durationDisplay"),
  surgeryLevel: document.getElementById("surgeryLevel"),
  customInsensible: document.getElementById("customInsensible"),
  latestHb: document.getElementById("latestHb"),
  targetHb: document.getElementById("targetHb"),
  bloodLossMl: document.getElementById("bloodLossMl"),
  urineOutputMl: document.getElementById("urineOutputMl"),
  prbcUnits: document.getElementById("prbcUnits"),
  ffpUnits: document.getElementById("ffpUnits"),
  crystalloidGivenMl: document.getElementById("crystalloidGivenMl"),
  prbcUnitVolumeMl: document.getElementById("prbcUnitVolumeMl"),
  prbcHbGramsPerUnit: document.getElementById("prbcHbGramsPerUnit"),
  ffpUnitVolumeMl: document.getElementById("ffpUnitVolumeMl"),
  manualBloodVolumeMl: document.getElementById("manualBloodVolumeMl"),
  bloodReplacementRatio: document.getElementById("bloodReplacementRatio"),
  crystalloidRetentionFraction: document.getElementById("crystalloidRetentionFraction"),
  estimatedBloodVolume: document.getElementById("estimatedBloodVolume"),
  estimatedMabl: document.getElementById("estimatedMabl"),
  estimatedCurrentHb: document.getElementById("estimatedCurrentHb"),
  neededPrbc: document.getElementById("neededPrbc"),
  neededFluid: document.getElementById("neededFluid"),
  fluidBreakdown: document.getElementById("fluidBreakdown"),
  hbBreakdown: document.getElementById("hbBreakdown"),
  bloodLossMlValue: document.getElementById("bloodLossMlValue"),
  urineOutputMlValue: document.getElementById("urineOutputMlValue"),
  prbcUnitsValue: document.getElementById("prbcUnitsValue"),
  ffpUnitsValue: document.getElementById("ffpUnitsValue"),
  crystalloidGivenMlValue: document.getElementById("crystalloidGivenMlValue")
};

let appState = loadState();
let activeCaseId = appState.activeCaseId;

function createCase(index = 1) {
  const startTime = defaultStartTimeValue();
  return {
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...CASE_DEFAULTS,
    caseName: `${DEFAULT_CASE_NAME} ${index}`,
    startTime
  };
}

function defaultStartTimeValue() {
  const defaultStart = new Date(Date.now() - (30 * 60000));
  return toDateTimeLocalValue(defaultStart);
}

function toDateTimeLocalValue(date) {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
    .toISOString()
    .slice(0, 16);
}

function readNumber(element, fallback = 0) {
  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min = 0) {
  return Math.max(value, min);
}

function formatMl(value) {
  return `${Math.round(value).toLocaleString("en-US")} mL`;
}

function formatHb(value) {
  return `${value.toFixed(1)} g/dL`;
}

function formatUnits(value) {
  return `${value.toFixed(1)} unit`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function currentDurationHours(startTimeValue) {
  if (!startTimeValue) {
    return 0;
  }

  const start = new Date(startTimeValue);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  return clamp((Date.now() - start.getTime()) / 3600000);
}

function janmahasatianLbwKg(sex, heightCm, weightKg) {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  if (!Number.isFinite(bmi) || bmi <= 0) {
    return 0;
  }

  if (sex === "female") {
    return (9270 * weightKg) / (8780 + (244 * bmi));
  }

  return (9270 * weightKg) / (6680 + (216 * bmi));
}

function estimatedBloodVolumeMl({ sex, heightCm, weightKg, manualBloodVolumeMl }) {
  if (manualBloodVolumeMl > 0) {
    return manualBloodVolumeMl;
  }

  const lbwKg = janmahasatianLbwKg(sex, heightCm, weightKg);
  const mlPerKgLeanTissue = sex === "female" ? 110 : 105;
  return lbwKg * mlPerKgLeanTissue;
}

function maintenanceRateMlHr(weightKg) {
  if (weightKg <= 10) {
    return weightKg * 4;
  }
  if (weightKg <= 20) {
    return 40 + ((weightKg - 10) * 2);
  }
  return 60 + (weightKg - 20);
}

function createBreakdownRows(entries) {
  return entries
    .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
    .join("");
}

function syncDialDisplays() {
  elements.bloodLossMlValue.textContent = formatMl(readNumber(elements.bloodLossMl));
  elements.urineOutputMlValue.textContent = formatMl(readNumber(elements.urineOutputMl));
  elements.prbcUnitsValue.textContent = formatUnits(readNumber(elements.prbcUnits));
  elements.ffpUnitsValue.textContent = formatUnits(readNumber(elements.ffpUnits));
  elements.crystalloidGivenMlValue.textContent = formatMl(readNumber(elements.crystalloidGivenMl));
}

function normalizeState(parsed) {
  if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error("Invalid cases");
  }

  const cases = parsed.cases.map((caseData, index) => ({
    ...CASE_DEFAULTS,
    ...caseData,
    id: caseData.id || `case-restored-${index + 1}`,
    caseName: caseData.caseName || `${DEFAULT_CASE_NAME} ${index + 1}`,
    startTime: caseData.startTime || defaultStartTimeValue()
  }));

  const active = cases.some((item) => item.id === parsed.activeCaseId)
    ? parsed.activeCaseId
    : cases[0].id;

  return {
    version: STORAGE_VERSION,
    activeCaseId: active,
    cases
  };
}

function createInitialState() {
  const initialCase = createCase(1);
  return {
    version: STORAGE_VERSION,
    activeCaseId: initialCase.id,
    cases: [initialCase]
  };
}

function loadStateFromHash() {
  try {
    const encoded = window.location.hash.replace("#state=", "");
    const json = decodeURIComponent(atob(encoded));
    return normalizeState(JSON.parse(json));
  } catch (error) {
    return null;
  }
}

function loadState() {
  if (window.location.hash.startsWith("#state=")) {
    const imported = loadStateFromHash();
    if (imported) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      saveState(imported);
      return imported;
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeState(JSON.parse(raw));
    }
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return createInitialState();
}

function saveState(state = appState) {
  const payload = {
    version: STORAGE_VERSION,
    activeCaseId: state.activeCaseId || activeCaseId,
    cases: state.cases
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getActiveCase() {
  return appState.cases.find((item) => item.id === activeCaseId) || appState.cases[0];
}

function renderCaseTabs() {
  elements.caseTabs.innerHTML = "";

  appState.cases.forEach((caseData, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `case-tab${caseData.id === activeCaseId ? " is-active" : ""}`;
    tab.dataset.caseId = caseData.id;
    tab.innerHTML = `
      <span>${caseData.caseName || `${DEFAULT_CASE_NAME} ${index + 1}`}</span>
      <small>${caseData.sex === "female" ? "F" : "M"} · Hb ${Number(caseData.latestHb).toFixed(1)}</small>
      ${appState.cases.length > 1 ? `<button class="case-close" type="button" aria-label="刪除病人" data-case-id="${caseData.id}">×</button>` : ""}
    `;
    elements.caseTabs.appendChild(tab);
  });
}

function fillForm(caseData) {
  FIELD_IDS.forEach((fieldId) => {
    const element = elements[fieldId];
    if (!element) {
      return;
    }
    element.value = `${caseData[fieldId] ?? CASE_DEFAULTS[fieldId] ?? ""}`;
  });
}

function updateCaseFromForm() {
  const active = getActiveCase();
  if (!active) {
    return;
  }

  FIELD_IDS.forEach((fieldId) => {
    const element = elements[fieldId];
    if (!element) {
      return;
    }

    if (element.type === "number" || element.type === "range") {
      active[fieldId] = readNumber(element, CASE_DEFAULTS[fieldId] ?? 0);
      return;
    }

    active[fieldId] = element.value;
  });

  if (!active.startTime) {
    active.startTime = defaultStartTimeValue();
    elements.startTime.value = active.startTime;
  }
}

function switchCase(caseId) {
  const target = appState.cases.find((item) => item.id === caseId);
  if (!target) {
    return;
  }

  activeCaseId = caseId;
  appState.activeCaseId = activeCaseId;
  fillForm(target);
  renderCaseTabs();
  calculate();
}

function addCase() {
  const newCase = createCase(appState.cases.length + 1);
  appState.cases.push(newCase);
  activeCaseId = newCase.id;
  appState.activeCaseId = activeCaseId;
  fillForm(newCase);
  renderCaseTabs();
  calculate();
}

function removeCase(caseId) {
  if (appState.cases.length <= 1) {
    return;
  }

  appState.cases = appState.cases.filter((item) => item.id !== caseId);
  if (activeCaseId === caseId) {
    activeCaseId = appState.cases[0].id;
  }
  appState.activeCaseId = activeCaseId;
  fillForm(getActiveCase());
  renderCaseTabs();
  calculate();
}

function calculate() {
  updateCaseFromForm();
  syncDialDisplays();

  const active = getActiveCase();
  const durationHr = currentDurationHours(active.startTime);
  elements.currentTimeDisplay.textContent = formatDateTime(new Date());
  elements.durationDisplay.textContent = `經過 ${durationHr.toFixed(1)} hr`;

  const input = {
    sex: active.sex,
    heightCm: Number(active.heightCm),
    weightKg: Number(active.weightKg),
    durationHr,
    latestHb: Number(active.latestHb),
    targetHb: Number(active.targetHb),
    bloodLossMl: Number(active.bloodLossMl),
    urineOutputMl: Number(active.urineOutputMl),
    prbcUnits: Number(active.prbcUnits),
    ffpUnits: Number(active.ffpUnits),
    crystalloidGivenMl: Number(active.crystalloidGivenMl),
    prbcUnitVolumeMl: Number(active.prbcUnitVolumeMl),
    prbcHbGramsPerUnit: Number(active.prbcHbGramsPerUnit),
    ffpUnitVolumeMl: Number(active.ffpUnitVolumeMl),
    manualBloodVolumeMl: Number(active.manualBloodVolumeMl),
    bloodReplacementRatio: Number(active.bloodReplacementRatio),
    crystalloidRetentionFraction: Number(active.crystalloidRetentionFraction)
  };

  const insensibleRate = active.surgeryLevel === "custom"
    ? Number(active.customInsensible)
    : Number(active.surgeryLevel);

  const ebvMl = estimatedBloodVolumeMl(input);
  const ebvDl = ebvMl / 100;
  const mablMl = input.latestHb > 0
    ? clamp(ebvMl * ((input.latestHb - input.targetHb) / input.latestHb))
    : 0;
  const bloodLossWithinMablMl = Math.min(input.bloodLossMl, mablMl);
  const bloodLossBeyondMablMl = clamp(input.bloodLossMl - mablMl);

  const startingHbMassGrams = input.latestHb * ebvDl;
  const lostHbMassGrams = input.latestHb * (input.bloodLossMl / 100);
  const transfusedHbMassGrams = input.prbcUnits * input.prbcHbGramsPerUnit;
  const currentHbMassGrams = clamp(startingHbMassGrams - lostHbMassGrams + transfusedHbMassGrams);

  const crystalloidIntravascularMl = input.crystalloidGivenMl * input.crystalloidRetentionFraction;
  const ffpIntravascularMl = input.ffpUnits * input.ffpUnitVolumeMl;
  const currentCirculatingVolumeMl = clamp(
    ebvMl - input.bloodLossMl - input.urineOutputMl - (input.weightKg * insensibleRate * input.durationHr)
      + (input.prbcUnits * input.prbcUnitVolumeMl) + ffpIntravascularMl + crystalloidIntravascularMl,
    ebvMl * 0.25
  );
  const currentHb = currentHbMassGrams / (currentCirculatingVolumeMl / 100);

  const requiredHbForExcessLossGrams = input.targetHb * (bloodLossBeyondMablMl / 100);
  const additionalHbNeededGrams = clamp(requiredHbForExcessLossGrams - transfusedHbMassGrams);
  const neededPrbcUnits = input.prbcHbGramsPerUnit > 0
    ? additionalHbNeededGrams / input.prbcHbGramsPerUnit
    : 0;

  const maintenanceMl = maintenanceRateMlHr(input.weightKg) * input.durationHr;
  const insensibleLossMl = input.weightKg * insensibleRate * input.durationHr;
  const bloodLossCrystalloidNeedMl = bloodLossWithinMablMl * input.bloodReplacementRatio;
  const cumulativeFluidNeedMl = maintenanceMl + insensibleLossMl + input.urineOutputMl + bloodLossCrystalloidNeedMl;
  const additionalFluidNeededMl = clamp(cumulativeFluidNeedMl - input.crystalloidGivenMl - ffpIntravascularMl);

  elements.estimatedBloodVolume.textContent = formatMl(ebvMl);
  elements.estimatedMabl.textContent = formatMl(mablMl);
  elements.estimatedCurrentHb.textContent = formatHb(currentHb);
  elements.neededPrbc.textContent = formatUnits(neededPrbcUnits);
  elements.neededFluid.textContent = formatMl(additionalFluidNeededMl);

  elements.fluidBreakdown.innerHTML = createBreakdownRows([
    ["Maintenance", formatMl(maintenanceMl)],
    ["依開始時間計算", `${input.durationHr.toFixed(1)} hr`],
    ["Insensible loss", formatMl(insensibleLossMl)],
    ["Urine replacement", formatMl(input.urineOutputMl)],
    ["MABL 內失血", formatMl(bloodLossWithinMablMl)],
    ["MABL 內失血晶體液替代", formatMl(bloodLossCrystalloidNeedMl)],
    ["FFP 視為 colloid", `- ${formatMl(ffpIntravascularMl)}`],
    ["晶體液血管內保留量", formatMl(crystalloidIntravascularMl)],
    ["已輸晶體液", `- ${formatMl(input.crystalloidGivenMl)}`],
    ["累積仍需點滴", formatMl(additionalFluidNeededMl)]
  ]);

  elements.hbBreakdown.innerHTML = createBreakdownRows([
    ["MABL", formatMl(mablMl)],
    ["已超過 MABL", formatMl(bloodLossBeyondMablMl)],
    ["起始 Hb mass", `${startingHbMassGrams.toFixed(1)} g`],
    ["失血帶走 Hb", `- ${lostHbMassGrams.toFixed(1)} g`],
    ["PRBC 補回 Hb", `+ ${transfusedHbMassGrams.toFixed(1)} g`],
    ["目前 Hb mass", `${currentHbMassGrams.toFixed(1)} g`],
    ["估算循環量", formatMl(currentCirculatingVolumeMl)],
    ["FFP 視為血管內", formatMl(ffpIntravascularMl)],
    ["晶體液視為血管內", formatMl(crystalloidIntravascularMl)],
    ["超過 MABL 尚缺 Hb", `${additionalHbNeededGrams.toFixed(1)} g`]
  ]);

  renderCaseTabs();
  appState.activeCaseId = activeCaseId;
  saveState();
}

function bindEvents() {
  document.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", calculate);
    element.addEventListener("change", calculate);
  });

  document.querySelectorAll(".stepper").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target);
      const step = Number.parseFloat(button.dataset.step);
      const current = readNumber(target);
      const min = Number.parseFloat(target.min);
      const max = Number.parseFloat(target.max);
      const next = Math.min(max, Math.max(min, current + step));
      target.value = `${next}`;
      calculate();
    });
  });

  elements.addCaseButton.addEventListener("click", addCase);

  elements.caseTabs.addEventListener("click", (event) => {
    const closeTarget = event.target.closest(".case-close");
    if (closeTarget) {
      event.stopPropagation();
      removeCase(closeTarget.dataset.caseId);
      return;
    }

    const tabTarget = event.target.closest(".case-tab");
    if (tabTarget) {
      switchCase(tabTarget.dataset.caseId);
    }
  });

}

bindEvents();
fillForm(getActiveCase());
renderCaseTabs();
setInterval(calculate, 60000);
calculate();
