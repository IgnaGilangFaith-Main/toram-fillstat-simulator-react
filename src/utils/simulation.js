import { Calc } from "./math.js";
import {
  MAX_STEPS,
  BONUS_STEPS,
  PENALTY_DATA,
  OPTIONS,
  toram_round,
  deep_clone,
} from "./constants.js";

export class Formula {
  constructor(stat) {
    this.stat = stat;
    this.formula = [];
    this.condensed_formula = [];
    this.step_changes = [];
    this.step_code_changes = [];
    this.redo_queue = [];
  }

  gatherChanges(slot, stat, delta_step, delta_stat, new_stat) {
    let positive = delta_step > 0 ? "+" : "";
    this.step_changes.push(`${stat} ${positive}${delta_stat}`);
    this.step_code_changes.push([slot, delta_step, new_stat || null]);
  }

  commitChanges() {
    if (!this.step_code_changes.length) return; // nothing changed

    const finished =
      this.stat.slots.every((slot) => slot.stat_name) ||
      this.stat.future_pot <= 0
        ? this.stat.getSuccessRate()
        : false;

    this.formula.push({
      repeat: 1,
      code: this.step_code_changes,
      text: this.step_changes.join(" "),
      pot_before: this.stat.pot,
      pot_after: this.stat.future_pot,
      step_mats: this.stat.step_mats,
      max_mats_before: this.stat.max_mats,
      max_mats_after: this.stat.step_max_mats || this.stat.max_mats,
      finished,
    });

    this.redo_queue = [];
    this.step_changes = [];
    this.step_code_changes = [];
    this.buildCondensedFormula();
  }

  buildCondensedFormula() {
    this.condensed_formula = [];
    let last_change = {};

    for (let step of this.formula) {
      if (last_change.text && last_change.text === step.text) {
        let target_step =
          this.condensed_formula[this.condensed_formula.length - 1];
        target_step.repeat++;
        target_step.pot_after = step.pot_after;
      } else {
        this.condensed_formula.push(deep_clone(step));
        last_change = step;
      }
    }
  }

  getDisplay() {
    if (!this.condensed_formula.length) {
      return "Belum ada langkah yang dilakukan.";
    }

    const display = this.condensed_formula.map(
      (step, index) =>
        `#${index + 1}. ${step.text}${
          step.repeat > 1 ? ` (x${step.repeat})` : ""
        } (${step.pot_after}pot)`
    );
    return display.join("\n");
  }

  undo() {
    let step = this.formula.pop();
    this.redo_queue.push(deep_clone(step));
    return step;
  }

  redo() {
    let step = this.redo_queue.pop();
    this.formula.push(deep_clone(step));
    return step;
  }
}

export class Slot {
  constructor(slot_num, stat) {
    this.currentStat = 0;
    this.futureStat = 0;
    this.currentSteps = 0;
    this.futureSteps = 0;
    this.slot_num = slot_num;
    this.stat_name = null;
    this.stat_data = null;
    this.stat_data_id = 0;
    this.stat = stat;
    this.new_stat = true;
    this.disabled = false;
  }

  onUpdate(selectedOptionId, inputValue) {
    if (selectedOptionId === 0 || selectedOptionId === "0") {
      // reset
      this.stat_name = null;
      this.stat_data = null;
      this.currentStat = 0;
      this.futureStat = 0;
      this.currentSteps = 0;
      this.futureSteps = 0;
      this.stat_data_id = 0;
      this.stat.onUpdate();
      return { isValid: true, matCost: "" };
    }

    // set up stat data in this slot
    let stat_data = deep_clone(OPTIONS[selectedOptionId - 1]);
    this.stat_data = stat_data;
    this.stat_name = stat_data.name;
    this.stat_data_id = selectedOptionId;

    if (this.new_stat) this.new_stat = selectedOptionId;

    let future_stat = inputValue || 0;

    // Allow empty string or values that are being typed
    if (future_stat === "" || future_stat === "-") {
      this.futureStat = 0;
      this.futureSteps = 0;
      const validation = this.validateInput();
      this.stat.onUpdate();
      return { isValid: true, matCost: "", validation };
    }

    // Validate that it contains only numbers and minus sign
    if (/[^0-9\-]/g.test(future_stat.toString())) {
      return { isValid: false, matCost: "" };
    }

    // Parse the value, default to 0 if parsing fails
    const parsedValue = parseInt(future_stat);
    this.futureStat = isNaN(parsedValue) ? 0 : parsedValue;
    this.futureSteps = this.statToSteps();

    const validation = this.validateInput();

    let matCost = "";
    if (this.currentSteps !== this.futureSteps) {
      matCost = this.getCostDisplay();
    }

    this.stat.onUpdate();
    return { isValid: validation.isValid, matCost, validation };
  }

  validateInput() {
    if (!this.stat_name) return { isValid: true, color: "blue" };

    const allowed_max = this.getMaxStat(this.futureStat < 0);

    if (
      Math.abs(this.futureStat) > allowed_max ||
      (this.futureSteps < 0 && this.stat_data.nonega)
    ) {
      return { isValid: false, color: "red" };
    } else if (this.futureSteps >= 0) {
      return { isValid: true, color: "black" };
    } else {
      return { isValid: true, color: "gray" };
    }
  }

  // Raw override for undo/redo functionality
  rawOverride(data) {
    const [slot_num, delta_steps, id] = data;

    if (id !== null) {
      if (id === 0) {
        this.stat_name = null;
        this.stat_data = null;
        this.currentStat = 0;
        this.futureStat = 0;
        this.currentSteps = 0;
        this.futureSteps = 0;
        this.stat_data_id = 0;
        this.new_stat = true;
        return;
      } else {
        this.stat_data_id = id;
        this.stat_data = deep_clone(OPTIONS[id - 1]);
        this.stat_name = this.stat_data.name;
        this.new_stat = false;
      }
    }

    this.futureSteps += delta_steps;
    this.currentSteps = this.futureSteps + 0;
    this.futureStat = this.stepsToStat(this.futureSteps);
    this.currentStat = this.futureStat + 0;
  }

  changeValueBySteps(value, relative = false) {
    let current_steps = this.futureSteps + 0;
    let future_steps = current_steps + 0;
    if (relative) future_steps += value;
    else future_steps = value;

    let future_stat = this.stepsToStat(future_steps);
    this.futureStat = future_stat;
    this.futureSteps = future_steps;
  }

  stepsToStat(value = this.futureSteps) {
    let is_negative = value < 0;
    value = Math.abs(value);
    const step_max = 100 / this.stat_data.pot;
    const change_per_step = this.stat_data.step || 1;
    const max_normal_value = this.max
      ? this.max / change_per_step
      : step_max > MAX_STEPS
      ? MAX_STEPS
      : step_max;

    if (value < max_normal_value) {
      value = value * (this.stat_data.step || 1);
    } else {
      const bonus = this.stat_data.bonus || this.stat_data.step || 1;
      value =
        max_normal_value * (this.stat_data.step || 1) +
        (value - max_normal_value) * bonus;
    }

    if (is_negative) value *= -1;
    return value;
  }

  statToSteps(value = this.futureStat) {
    const input_is_negative = value < 0 ? -1 : 1;
    const step_max = 100 / this.stat_data.pot;
    const change_per_step = this.stat_data.step || 1;
    const max_normal_step = step_max > MAX_STEPS ? MAX_STEPS : step_max;
    const max_normal_value = this.max
      ? this.max
      : step_max > MAX_STEPS
      ? MAX_STEPS * change_per_step
      : step_max * change_per_step;
    let future_steps;

    if (Math.abs(value) > max_normal_value) {
      const overstep = this.stat_data.bonus || change_per_step;
      future_steps =
        (max_normal_step + (Math.abs(value) - max_normal_value) / overstep) *
        input_is_negative;
    } else {
      future_steps = value / change_per_step;
    }
    return toram_round(future_steps);
  }

  calcBonusSteps() {
    const bonus_steps = Math.floor(
      BONUS_STEPS * (this.stat_data.bonusratio || 1)
    );
    const reduction = this.stat_data.bonusdeduction || 0;
    return bonus_steps - reduction;
  }

  getMaxStat(isNega) {
    const step_max = 100 / this.stat_data.pot;
    const bonus_steps = this.calcBonusSteps();
    const custom_max = (this.stat_data.max || 0) * (this.stat_data.step || 1);
    const base_max = step_max > MAX_STEPS ? MAX_STEPS : step_max;
    const max_base_stat = (this.stat_data.step || 1) * base_max;
    const bonus_max = (this.stat_data.bonus || 0) * bonus_steps;

    if (this.stat_data.bonus) {
      let value = (custom_max || max_base_stat) + bonus_max;
      if (isNega && this.stat_data.max_only) return custom_max || max_base_stat;
      return value;
    } else if (custom_max) {
      return custom_max;
    } else {
      return base_max * (this.stat_data.step || 1);
    }
  }

  getMaxSteps(isNega) {
    const stat = this.getMaxStat(isNega);
    return this.statToSteps(stat);
  }

  getCost() {
    const base_cost = this.stat_data.cost;
    const change = this.currentSteps < this.futureStat ? 1 : -1;

    let cost = 0;
    for (
      let i = this.currentSteps + change;
      change > 0 ? i <= this.futureSteps : i >= this.futureSteps;
      i += change
    ) {
      cost += base_cost * Math.pow(i, 2);
    }

    return cost * this.stat.getCostReduction();
  }

  getMatType() {
    return this.stat_data.mat;
  }

  getCostDisplay() {
    const cost = toram_round(this.getCost());
    return `(${cost} ${this.getMatType()})`;
  }

  getPotentialChange() {
    if (this.currentSteps === this.futureSteps) return 0;
    const change = this.currentSteps > this.futureSteps ? -1 : 1;

    let current_steps = this.currentSteps + 0;
    let future_steps = this.futureSteps + 0;

    const step_max = 100 / this.stat_data.pot;
    const max_normal_steps =
      this.stat_data.max || (step_max > MAX_STEPS ? MAX_STEPS : step_max);

    const all = [current_steps, future_steps].sort((a, b) => a - b);
    let diff = all[1] - all[0];
    let bonus_diff = 0;

    // trim anything below the standard minimum
    if (all[0] < -max_normal_steps) {
      let extras = Math.abs(all[0]) - max_normal_steps;
      diff -= extras;
      bonus_diff += extras;
    }

    // trim anything above the standard maximum
    if (all[1] > max_normal_steps) {
      let extras = all[1] - max_normal_steps;
      diff -= extras;
      bonus_diff += extras;
    }

    // trim bonus for cases where both values are in bonus range
    if (diff < 0) {
      bonus_diff += diff;
      diff = 0;
    }
    const double = ![this.stat.type, "u", "e"].includes(this.stat_data.type)
      ? 2
      : 1;
    const basicpot = Calc(diff).multiply(this.stat_data.pot);
    const bonuspot = Calc(bonus_diff).multiply(this.stat_data.pot).multiply(2);

    // negatives have an extra multiplier
    if (change === -1) {
      basicpot.multiply(this.stat.potential_return).multiply(0.01);
      bonuspot.multiply(this.stat.bonus_potential_return).multiply(0.01);
    }

    // add the 2 different types of potential return together
    const totalpot = basicpot
      .add(bonuspot)
      .multiply(double)
      .multiply(-change)
      .result();

    return toram_round(totalpot);
  }

  cleanUpValue() {
    let future_stat = parseInt(this.futureStat);
    if (this.stepsToStat(this.futureSteps) !== future_stat) {
      // invalid step... try to match intention first
      if (future_stat % this.stat_data.step === 0) {
        this.futureSteps = future_stat / this.stat_data.step;
      } else if (future_stat <= this.getMaxSteps()) {
        this.futureSteps = future_stat + 0;
      } else {
        this.futureSteps = toram_round(this.futureSteps);
      }

      this.futureStat = this.stepsToStat(this.futureSteps);
    }
  }

  confirm() {
    this.currentStat = parseInt(this.futureStat);
    this.currentSteps = this.futureSteps + 0;
    this.new_stat = false;
  }
}

export class Stat {
  constructor(details) {
    this.slots = Array.from({ length: 8 }, (_, i) => new Slot(i, this));
    this.details = deep_clone(details);
    this.type = details.weap_arm;
    this.recipe_pot = parseInt(details.recipe_pot);
    this.pot = parseInt(details.starting_pot);
    this.future_pot = this.pot + 0;
    this.steps = new Formula(this);
    this.starting_pot = parseInt(details.starting_pot);

    this.mats = { Metal: 0, Cloth: 0, Beast: 0, Wood: 0, Medicine: 0, Mana: 0 };
    this.step_mats = {
      Metal: 0,
      Cloth: 0,
      Beast: 0,
      Wood: 0,
      Medicine: 0,
      Mana: 0,
    };

    this.max_mats = 0;
    this.step_max_mats = 0;

    this.tec = parseInt(details.tec) || 0;
    this.potential_return = 5 + this.tec / 10;
    this.bonus_potential_return = this.potential_return / 4;

    this.proficiency = parseInt(details.proficiency) || 0;
    this.mat_reduction = details.mat_reduction || false;

    this.finished = false;
  }

  calculatePenalty() {
    const categories = {};
    for (let slot of this.slots) {
      if (!slot.stat_name || (slot.new_stat && !slot.futureSteps)) continue;
      if (!categories[slot.stat_data.cat]) categories[slot.stat_data.cat] = 0;
      categories[slot.stat_data.cat]++;
    }
    let penalty_values = Object.keys(categories)
      .map((c) => categories[c])
      .map((repeats) => PENALTY_DATA[repeats]);
    if (!penalty_values.length) return 1;

    let penalty = penalty_values.reduce((a, b) => a + b);
    return 1 + 0.01 * penalty;
  }

  getCostReduction() {
    let percent =
      100 -
      (Math.floor(this.proficiency / 10) + Math.floor(this.proficiency / 50));
    if (this.mat_reduction) percent *= 0.9;
    return 0.01 * percent;
  }

  getSuccessRate() {
    if (typeof this.finished === "number") return this.finished;
    let prev_pot = this.pot > this.recipe_pot ? this.pot : this.recipe_pot;

    let success_rate = 160 + (this.future_pot * 230) / prev_pot;
    if (success_rate > 100) success_rate = 100;
    if (success_rate < 0) success_rate = 0;
    return toram_round(success_rate);
  }

  onUpdate() {
    // update data
    let delta_pot = 0;
    for (let slot of this.slots) {
      if (!slot.stat_name) continue;
      delta_pot += slot.getPotentialChange();
    }

    let penalty = this.calculatePenalty();
    this.future_pot = this.pot + toram_round(penalty * delta_pot);
  }

  removeEmptySlots() {
    for (const slot of this.slots) {
      if (slot.new_stat && !slot.futureSteps) {
        slot.rawOverride([slot.slot_num, 0, 0]);
      }
    }
  }

  confirm() {
    this.removeEmptySlots();
    this.step_mats = {
      Metal: 0,
      Cloth: 0,
      Beast: 0,
      Wood: 0,
      Medicine: 0,
      Mana: 0,
    };

    // Calculate potential change BEFORE confirming slots
    let delta_pot = 0;
    for (let slot of this.slots) {
      if (!slot.stat_name) continue;
      delta_pot += slot.getPotentialChange();
    }

    let penalty = this.calculatePenalty();
    this.future_pot = this.pot + toram_round(penalty * delta_pot);

    for (const slot of this.slots) {
      if (!slot.stat_name) continue;

      slot.cleanUpValue();
      if (slot.currentSteps === slot.futureSteps) continue;

      const used_mat = slot.getMatType();
      const used_mat_amount = slot.getCost();

      this.step_mats[used_mat] += used_mat_amount;

      this.steps.gatherChanges(
        slot.slot_num,
        slot.stat_name,
        slot.futureSteps - slot.currentSteps,
        slot.futureStat - slot.currentStat,
        slot.new_stat
      );
      slot.confirm();
    }

    for (const mat in this.step_mats) {
      this.step_mats[mat] = toram_round(this.step_mats[mat]);
      this.mats[mat] += this.step_mats[mat];
    }

    this.step_max_mats = Object.keys(this.step_mats)
      .map((m) => this.step_mats[m])
      .sort((a, b) => b - a)[0];
    if (this.step_max_mats <= this.max_mats) this.step_max_mats = 0;

    this.steps.commitChanges();

    if (this.step_max_mats) {
      this.max_mats = this.step_max_mats + 0;
      this.step_max_mats = 0;
    }

    if (this.slots.every((slot) => slot.stat_name) || this.future_pot <= 0) {
      this.finished = this.getSuccessRate();
    } else {
      this.pot = this.future_pot + 0;
    }
  }

  resetToBase() {
    for (const slot of this.slots) {
      if (slot.new_stat) {
        slot.rawOverride([slot.slot_num, 0, 0]);
      } else {
        slot.futureSteps = slot.currentSteps;
        slot.futureStat = slot.currentStat;
      }
    }
  }

  undo() {
    if (!this.steps.formula.length) return;

    this.resetToBase();

    let last_step = this.steps.undo();
    if (this.finished) {
      this.finished = false;
    }

    // Set potential directly from saved data (like original code)
    this.future_pot = last_step.pot_before + 0;
    this.pot = last_step.pot_before + 0;

    for (let mat in last_step.step_mats) {
      this.mats[mat] -= last_step.step_mats[mat];
    }
    this.max_mats = last_step.max_mats_before;

    const step_data = last_step.code;
    for (const instruction of step_data) {
      let slot_num = instruction[0];
      if (instruction[2]) instruction[2] = 0;
      instruction[1] *= -1;
      this.slots[slot_num].rawOverride(instruction);
    }

    this.steps.buildCondensedFormula();
  }

  redo() {
    let last_step = this.steps.redo();
    this.resetToBase();

    // Set potential directly from saved data (like original code)
    this.future_pot = last_step.pot_after + 0;
    this.pot = last_step.pot_after + 0;

    for (let mat in last_step.step_mats) {
      this.mats[mat] += last_step.step_mats[mat];
    }
    this.max_mats = last_step.max_mats_after;

    const step_data = last_step.code;
    for (const instruction of step_data) {
      let slot_num = instruction[0];
      this.slots[slot_num].rawOverride(instruction);
    }

    if (last_step.finished) {
      this.finished = last_step.finished;
    }

    this.steps.buildCondensedFormula();
  }

  repeat() {
    if (this.finished) return;
    if (!this.steps.formula.length) return;

    const last_step = this.steps.formula[this.steps.formula.length - 1];

    for (const code of last_step.code) {
      const [slot_num, delta] = code;
      this.slots[slot_num].changeValueBySteps(delta, true);
    }

    this.confirm();
  }
}
