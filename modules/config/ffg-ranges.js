export const personal_ranges = {
  "Engaged": {
    value: "Engaged",
    label: "SWFFG.WeaponRangeEngaged",
  },
  "Short": {
    value: "Short",
    label: "SWFFG.WeaponRangeShort",
  },
  "Medium": {
    value: "Medium",
    label: "SWFFG.WeaponRangeMedium",
  },
  "Long": {
    value: "Long",
    label: "SWFFG.WeaponRangeLong",
  },
  "Extreme": {
    value: "Extreme",
    label: "SWFFG.WeaponRangeExtreme",
  },
};

export function configureVehicleRange() {
  const rangeBands = game.settings.get("starwarsffg", "vehicleRangeBand");
  CONFIG.FFG.rangeTheme = rangeBands;

  if (rangeBands === "starwars") {
    CONFIG.FFG.vehicle_ranges = {
      "Close": {
        value: "Close",
        label: "SWFFG.VehicleRangeClose",
      },
      "Short": {
        value: "Short",
        label: "SWFFG.VehicleRangeShort",
      },
      "Medium": {
        value: "Medium",
        label: "SWFFG.VehicleRangeMedium",
      },
      "Long": {
        value: "Long",
        label: "SWFFG.VehicleRangeLong",
      },
      "Extreme": {
        value: "Extreme",
        label: "SWFFG.VehicleRangeExtreme",
      },
    }
  } else {
    CONFIG.FFG.vehicle_ranges = {
      "Engaged": {
        value: "Engaged",
        label: "SWFFG.WeaponRangeEngaged",
      },
      "Short": {
        value: "Short",
        label: "SWFFG.VehicleRangeShort",
      },
      "Medium": {
        value: "Medium",
        label: "SWFFG.VehicleRangeMedium",
      },
      "Long": {
        value: "Long",
        label: "SWFFG.VehicleRangeLong",
      },
      "Extreme": {
        value: "Extreme",
        label: "SWFFG.VehicleRangeExtreme",
      },
      "Strategic": {
        value: "Strategic",
        label: "SWFFG.VehicleRangeStrategic",
      },
    }
  }
}

export const sensor_ranges = {
  "None": {
    value: "None",
    label: "SWFFG.VehicleRangeNone",
  },
  "Close": {
    value: "Close",
    label: "SWFFG.VehicleRangeClose",
  },
  "Short": {
    value: "Short",
    label: "SWFFG.VehicleRangeShort",
  },
  "Medium": {
    value: "Medium",
    label: "SWFFG.VehicleRangeMedium",
  },
  "Long": {
    value: "Long",
    label: "SWFFG.VehicleRangeLong",
  },
  "Extreme": {
    value: "Extreme",
    label: "SWFFG.VehicleRangeExtreme",
  },
};
