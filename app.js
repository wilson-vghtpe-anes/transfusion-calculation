const elements = {
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

  const diffMs = Date.now() - start.getTime();
  return clamp(diffMs / 3600000);
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

function calculate() {
  syncDialDisplays();

  const durationHr = currentDurationHours(elements.startTime.value);
  elements.currentTimeDisplay.textContent = formatDateTime(new Date());
  elements.durationDisplay.textContent = `經過 ${durationHr.toFixed(1)} hr`;

  const input = {
    sex: elements.sex.value,
    heightCm: readNumber(elements.heightCm),
    weightKg: readNumber(elements.weightKg),
    durationHr,
    latestHb: readNumber(elements.latestHb),
    targetHb: readNumber(elements.targetHb),
    bloodLossMl: readNumber(elements.bloodLossMl),
    urineOutputMl: readNumber(elements.urineOutputMl),
    prbcUnits: readNumber(elements.prbcUnits),
    ffpUnits: readNumber(elements.ffpUnits),
    crystalloidGivenMl: readNumber(elements.crystalloidGivenMl),
    prbcUnitVolumeMl: readNumber(elements.prbcUnitVolumeMl),
    prbcHbGramsPerUnit: readNumber(elements.prbcHbGramsPerUnit),
    ffpUnitVolumeMl: readNumber(elements.ffpUnitVolumeMl),
    manualBloodVolumeMl: readNumber(elements.manualBloodVolumeMl),
    bloodReplacementRatio: readNumber(elements.bloodReplacementRatio, 1),
    crystalloidRetentionFraction: readNumber(elements.crystalloidRetentionFraction, 0.25)
  };

  const insensibleRate = elements.surgeryLevel.value === "custom"
    ? readNumber(elements.customInsensible)
    : readNumber(elements.surgeryLevel);

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
    ebvMl - input.bloodLossMl - input.urineOutputMl - (input.weightKg * insensibleRate * input.durationHr) + (input.prbcUnits * input.prbcUnitVolumeMl) + ffpIntravascularMl + crystalloidIntravascularMl,
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
}

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

if (!elements.startTime.value) {
  const defaultStart = new Date(Date.now() - (4 * 3600000));
  const local = new Date(defaultStart.getTime() - (defaultStart.getTimezoneOffset() * 60000))
    .toISOString()
    .slice(0, 16);
  elements.startTime.value = local;
}

setInterval(calculate, 60000);

calculate();
