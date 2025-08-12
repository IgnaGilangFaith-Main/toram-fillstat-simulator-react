import { memo, useState, useEffect, useCallback, useRef } from "react";
import { OPTIONS } from "../utils/constants.js";

const SlotRow = memo(
  ({ slotIndex, slot, stat, onSlotChange, updateTrigger }) => {
    const [selectedOption, setSelectedOption] = useState(
      slot.stat_data_id || 0
    );
    const [inputValue, setInputValue] = useState(
      slot.futureStat?.toString() || "0"
    );
    const [matCost, setMatCost] = useState("");
    const [inputClass, setInputClass] = useState("stat-input");
    const debounceRef = useRef(null);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    // Update local state when slot data changes
    useEffect(() => {
      setSelectedOption(slot.stat_data_id || 0);

      // Update input value berdasarkan slot.futureStat
      const inputElement = document.querySelector(
        `input[data-slot="${slotIndex}"]`
      );
      const isInputFocused = document.activeElement === inputElement;

      // Jika input tidak sedang difocus, update value sesuai dengan slot data
      if (!isInputFocused) {
        const newValue = slot.futureStat?.toString() || "0";
        if (inputValue !== newValue) {
          setInputValue(newValue);
        }
      }
    }, [slot.stat_data_id, slot.futureStat, slotIndex, updateTrigger]);

    const handleOptionChange = useCallback(
      (newOptionId) => {
        setSelectedOption(newOptionId);

        if (newOptionId === 0 || newOptionId === "0") {
          setInputValue("0");
          setMatCost("");
          setInputClass("stat-input");
          return;
        }

        // Gunakan nilai input saat ini
        const currentValue = parseInt(inputValue) || 0;
        const result = onSlotChange(
          slotIndex,
          parseInt(newOptionId),
          currentValue
        );
        if (result) {
          setMatCost(result.matCost || "");
          updateInputClass(result.validation);
        }
      },
      [slotIndex, inputValue, onSlotChange]
    );

    const updateSimulation = useCallback(
      (cleanValue) => {
        if (selectedOption > 0) {
          const result = onSlotChange(slotIndex, selectedOption, cleanValue);
          if (result) {
            setMatCost(result.matCost || "");
            updateInputClass(result.validation);
          }
        }
      },
      [selectedOption, slotIndex, onSlotChange]
    );

    const handleInputChange = useCallback(
      (e) => {
        const value = e.target.value;

        // Langsung update tampilan tanpa delay
        setInputValue(value);

        // Debounce untuk simulasi saja
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          const numValue = parseInt(value) || 0;
          const boundedValue = Math.max(-9999, Math.min(9999, numValue));
          updateSimulation(boundedValue);
        }, 500); // Perbesar delay agar user punya waktu mengetik
      },
      [updateSimulation]
    );

    const updateInputClass = useCallback((validation) => {
      if (!validation) {
        setInputClass("stat-input");
        return;
      }

      let className = "stat-input";
      if (validation.color === "red") {
        className += " invalid";
      } else if (validation.color === "gray") {
        className += " negative";
      } else {
        className += " valid";
      }
      setInputClass(className);
    }, []);

    const buildOptions = () => {
      let options = [
        <option key="0" value="0">
          PILIH STAT
        </option>,
      ];
      let lastCat = "";
      let catId = 0;

      for (let data of OPTIONS) {
        if (stat.type === "a" && data.cat === "Awaken Elements") continue;

        if (lastCat !== data.cat) {
          options.push(
            <option
              key={`cat-${catId}`}
              value="-1"
              disabled
              style={{ color: "blue" }}
            >
              &gt;-- {data.cat} --&lt;
            </option>
          );
          lastCat = data.cat;
        }

        catId++;
        options.push(
          <option key={catId} value={catId}>
            {data.name}
          </option>
        );
      }

      return options;
    };

    const isInputDisabled =
      selectedOption === 0 || selectedOption === "0" || stat.finished;

    return (
      <div className="slot-row">
        <div className="slot-number">{slotIndex + 1}</div>
        <select
          className="stat-select"
          value={selectedOption}
          onChange={(e) => handleOptionChange(e.target.value)}
          disabled={stat.finished}
        >
          {buildOptions()}
        </select>
        <input
          className={inputClass}
          type="text"
          placeholder="0"
          disabled={isInputDisabled}
          value={inputValue}
          data-slot={slotIndex}
          onChange={handleInputChange}
          onFocus={(e) => {
            // Select all saat focus pertama kali
            e.target.select();
          }}
          onBlur={(e) => {
            // Hanya cleanup saat benar-benar blur (tidak dalam proses typing)
            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
            }

            const value = e.target.value.trim();
            let finalValue;

            if (value === "" || value === "-" || isNaN(parseInt(value))) {
              finalValue = 0;
            } else {
              const numValue = parseInt(value);
              finalValue = Math.max(-9999, Math.min(9999, numValue));
            }

            // Update nilai dan simulasi
            setInputValue(finalValue.toString());
            updateSimulation(finalValue);
          }}
          // Hindari event yang bisa menyebabkan blur tidak diinginkan
          onKeyDown={(e) => {
            // Hanya handle key yang benar-benar perlu
            if (e.key === "Tab") {
              // Biarkan Tab berpindah secara natural
              return;
            }
            if (e.key === "Enter") {
              // Enter akan blur tapi controlled
              e.target.blur();
              return;
            }
            // Jangan handle key lain agar input tetap normal
          }}
        />
        <span className="mat-cost">{matCost}</span>
      </div>
    );
  }
);

SlotRow.displayName = "SlotRow";

const SlotsPanel = memo(({ stat, onSlotChange, updateTrigger }) => {
  return (
    <div className="slots-section">
      <h3>📋 Slot Stats</h3>
      <div className="slots-container">
        {stat.slots.map((slot, index) => (
          <SlotRow
            key={`${index}-${updateTrigger}`} // Gunakan updateTrigger untuk memaksa re-render
            slotIndex={index}
            slot={slot}
            stat={stat}
            onSlotChange={onSlotChange}
            updateTrigger={updateTrigger}
          />
        ))}
      </div>
    </div>
  );
});

SlotsPanel.displayName = "SlotsPanel";

export default SlotsPanel;
