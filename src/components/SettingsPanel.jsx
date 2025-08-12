import { memo } from "react";

const SettingsPanel = memo(
  ({ settings, onSettingsChange, onStartSimulation, isSimulationActive }) => {
    const handleInputChange = (field, value) => {
      onSettingsChange({ [field]: value });
    };

    return (
      <div className="settings-section">
        <h3>⚙️ Pengaturan Dasar</h3>
        <div className="settings-row">
          <div className="form-group">
            <label htmlFor="itemType">Tipe Item:</label>
            <select
              id="itemType"
              value={settings.itemType}
              onChange={(e) => handleInputChange("itemType", e.target.value)}
            >
              <option value="w">Weapon (Senjata)</option>
              <option value="a">Armor (Zirah)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="startingPot">POT Awal:</label>
            <input
              type="number"
              id="startingPot"
              placeholder="Contoh: 99"
              min="1"
              max="999"
              value={settings.startingPot}
              onChange={(e) =>
                handleInputChange("startingPot", parseInt(e.target.value) || "")
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="recipePot">POT Resep:</label>
            <input
              type="number"
              id="recipePot"
              min="1"
              max="999"
              value={settings.recipePot}
              onChange={(e) =>
                handleInputChange("recipePot", parseInt(e.target.value) || 46)
              }
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="form-group">
            <label htmlFor="tec">TEC:</label>
            <input
              type="number"
              id="tec"
              min="0"
              max="255"
              value={settings.tec}
              onChange={(e) =>
                handleInputChange("tec", parseInt(e.target.value) || 255)
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="proficiency">Proficiency:</label>
            <input
              type="number"
              id="proficiency"
              min="0"
              max="999"
              value={settings.proficiency}
              onChange={(e) =>
                handleInputChange("proficiency", parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div className="form-group">
            <label className="checkbox-group">
              <input
                type="checkbox"
                id="matReduction"
                checked={settings.matReduction}
                onChange={(e) =>
                  handleInputChange("matReduction", e.target.checked)
                }
              />
              10% Mat Reduction
            </label>
          </div>
          <div className="form-group">
            <button onClick={onStartSimulation}>
              🚀 {isSimulationActive ? "Reset & Mulai Ulang" : "Mulai Simulasi"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SettingsPanel.displayName = "SettingsPanel";

export default SettingsPanel;
