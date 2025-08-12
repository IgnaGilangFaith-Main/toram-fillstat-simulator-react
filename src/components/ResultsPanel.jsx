import { memo, useMemo } from "react";

const ResultsPanel = memo(
  ({ stat, onConfirm, onUndo, onRedo, onRepeat, updateTrigger }) => {
    const potentialDisplay = useMemo(() => {
      return `Potential: ${stat.future_pot} / ${stat.pot}`;
    }, [stat.future_pot, stat.pot, updateTrigger]);

    const successRateData = useMemo(() => {
      const rate = stat.getSuccessRate();
      let rateClass = "success-rate ";

      if (rate >= 80) {
        rateClass += "high";
      } else if (rate >= 60) {
        rateClass += "medium";
      } else {
        rateClass += "low";
      }

      return {
        rate,
        className: rateClass,
        display: `Success Rate: ${rate}%`,
      };
    }, [stat, updateTrigger]);

    const formulaDisplay = useMemo(() => {
      let display = stat.steps.getDisplay();

      if (typeof stat.finished === "number") {
        display += `\n\n🎯 Final Result:\nSuccess Rate: ${stat.getSuccessRate()}%`;

        if (stat.tec !== 255) {
          display += ` (${stat.tec} TEC)`;
        }

        const matsUsed = Object.keys(stat.mats)
          .filter((mat) => stat.mats[mat] > 0)
          .map((mat) => `${stat.mats[mat]} ${mat}`)
          .join(" / ");

        if (matsUsed) {
          display += `\n📦 Materials Used: ${matsUsed} (Max: ${stat.max_mats})`;
        }

        let settings = [];
        if (stat.proficiency) settings.push(`${stat.proficiency} proficiency`);
        if (stat.mat_reduction) settings.push("10% mat reduction");
        if (settings.length) {
          display += `\n⚙️ Bonuses: ${settings.join(" + ")}`;
        }
      }

      const content = `📊 Langkah-langkah:\n\n${
        stat.type === "w" ? "⚔️ Weapon" : "🛡️ Armor"
      } - Starting Potential: ${stat.starting_pot}\n\n${
        display || "Belum ada langkah yang dilakukan."
      }`;

      return content;
    }, [stat, updateTrigger]);

    const materialData = useMemo(() => {
      const materials = [
        { key: "Metal", display: "Metal / Logam" },
        { key: "Cloth", display: "Cloth / Kain" },
        { key: "Beast", display: "Beast / Fauna" },
        { key: "Wood", display: "Wood / Kayu" },
        { key: "Medicine", display: "Medicine / Obat" },
        { key: "Mana", display: "Mana" },
      ];

      return materials.map((mat) => ({
        ...mat,
        amount: stat.mats[mat.key] || 0,
      }));
    }, [stat.mats, updateTrigger]);

    const buttonStates = useMemo(() => {
      return {
        confirmDisabled: stat.pot === stat.future_pot || stat.finished,
        undoDisabled: !stat.steps.formula.length,
        redoDisabled: !stat.steps.redo_queue.length,
        repeatDisabled:
          !stat.steps.formula.length || stat.finished || stat.future_pot <= 0,
      };
    }, [stat, updateTrigger]);

    return (
      <div className="results-section">
        <h3>📊 Hasil Simulasi</h3>

        <div className="potential-display">{potentialDisplay}</div>

        <div className={successRateData.className}>
          {successRateData.display}
        </div>

        <div className="controls">
          <button
            onClick={onConfirm}
            disabled={buttonStates.confirmDisabled}
            title="Konfirmasi langkah saat ini"
          >
            ✅ Confirm
          </button>
          <button
            onClick={onRepeat}
            disabled={buttonStates.repeatDisabled}
            title="Ulangi langkah terakhir"
          >
            🔄 Repeat
          </button>
          <button
            onClick={onUndo}
            disabled={buttonStates.undoDisabled}
            title="Batalkan langkah terakhir"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={buttonStates.redoDisabled}
            title="Ulangi langkah yang dibatalkan"
          >
            ↷ Redo
          </button>
        </div>

        <div className="formula-display">{formulaDisplay}</div>

        <div className="material-costs">
          <h4>💎 Biaya Material</h4>
          <table className="material-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {materialData.map((mat) => (
                <tr key={mat.key}>
                  <td>{mat.display}</td>
                  <td className={mat.amount > 0 ? "material-amount" : ""}>
                    {mat.amount}
                  </td>
                </tr>
              ))}
              <tr className="max-material">
                <th>Max/Step</th>
                <td>{stat.max_mats}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

ResultsPanel.displayName = "ResultsPanel";

export default ResultsPanel;
