import { useState, useEffect, useCallback } from "react";
import { Stat } from "./utils/simulation.js";
import {
  OPTIONS,
  DEFAULT_WEAPON_RECIPE_POT,
  DEFAULT_ARMOR_RECIPE_POT,
} from "./utils/constants.js";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SlotsPanel from "./components/SlotsPanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import "./App.css";

function App() {
  const [settings, setSettings] = useState({
    itemType: "w",
    startingPot: "",
    recipePot: DEFAULT_WEAPON_RECIPE_POT,
    tec: 255,
    proficiency: 0,
    matReduction: false,
  });

  const [currentStat, setCurrentStat] = useState(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("toram_simulator_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("toram_simulator_settings", JSON.stringify(settings));
  }, [settings]);

  // Update recipe pot when item type changes
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      recipePot:
        prev.itemType === "w"
          ? DEFAULT_WEAPON_RECIPE_POT
          : DEFAULT_ARMOR_RECIPE_POT,
    }));
  }, [settings.itemType]);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const startSimulation = useCallback(() => {
    if (!settings.startingPot || settings.startingPot < 1) {
      alert("❌ Silakan masukkan POT awal yang valid!");
      return;
    }

    if (!settings.recipePot || settings.recipePot < 1) {
      alert("❌ Silakan masukkan POT resep yang valid!");
      return;
    }

    try {
      const statDetails = {
        weap_arm: settings.itemType,
        starting_pot: settings.startingPot,
        recipe_pot: settings.recipePot,
        tec: settings.tec,
        proficiency: settings.proficiency,
        mat_reduction: settings.matReduction,
      };

      const newStat = new Stat(statDetails);
      setCurrentStat(newStat);
      setIsSimulationActive(true);
      setUpdateTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error starting simulation:", error);
      alert(
        "❌ Terjadi error saat memulai simulasi. Silakan refresh halaman dan coba lagi."
      );
    }
  }, [settings]);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  const handleSlotChange = useCallback(
    (slotIndex, selectedOptionId, inputValue) => {
      if (!currentStat) return;

      const result = currentStat.slots[slotIndex].onUpdate(
        selectedOptionId,
        inputValue
      );
      triggerUpdate();
      return result;
    },
    [currentStat, triggerUpdate]
  );

  const confirmStep = useCallback(() => {
    if (!currentStat) return;

    currentStat.confirm();
    triggerUpdate();
  }, [currentStat, triggerUpdate]);

  const undoStep = useCallback(() => {
    if (!currentStat) return;

    currentStat.undo();
    triggerUpdate();
  }, [currentStat, triggerUpdate]);

  const redoStep = useCallback(() => {
    if (!currentStat) return;

    currentStat.redo();
    triggerUpdate();
  }, [currentStat, triggerUpdate]);

  const repeatStep = useCallback(() => {
    if (!currentStat) return;

    currentStat.repeat();
    triggerUpdate();
  }, [currentStat, triggerUpdate]);

  return (
    <div className="app">
      <div className="container">
        <h1>🗡️ Toram Fill Stats Simulator 🛡️</h1>

        <div className="disclaimer">
          ⚠️ Ini hanyalah simulasi saja, bisa terjadi perbedaan di dalam game.
        </div>

        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onStartSimulation={startSimulation}
          isSimulationActive={isSimulationActive}
        />

        {isSimulationActive && currentStat && (
          <div className="workspace">
            <SlotsPanel
              stat={currentStat}
              onSlotChange={handleSlotChange}
              updateTrigger={updateTrigger}
            />
            <ResultsPanel
              stat={currentStat}
              onConfirm={confirmStep}
              onUndo={undoStep}
              onRedo={redoStep}
              onRepeat={repeatStep}
              updateTrigger={updateTrigger}
            />
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Created by{" "}
            <a
              href="https://web.facebook.com/Kentungz.Igna"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Igna Gilang Faith
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
