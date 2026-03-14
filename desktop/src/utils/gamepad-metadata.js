const XBOX_BUTTON_NAMES = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "LB",
  5: "RB",
  6: "LT",
  7: "RT",
  8: "View",
  9: "Menu",
  10: "LS",
  11: "RS",
  12: "D-Pad Up",
  13: "D-Pad Down",
  14: "D-Pad Left",
  15: "D-Pad Right",
  16: "Guide"
};

const PLAYSTATION_BUTTON_NAMES = {
  0: "Cross",
  1: "Circle",
  2: "Square",
  3: "Triangle",
  4: "L1",
  5: "R1",
  6: "L2",
  7: "R2",
  8: "Share",
  9: "Options",
  10: "L3",
  11: "R3",
  12: "D-Pad Up",
  13: "D-Pad Down",
  14: "D-Pad Left",
  15: "D-Pad Right",
  16: "PS"
};

const NINTENDO_BUTTON_NAMES = {
  0: "B",
  1: "A",
  2: "Y",
  3: "X",
  4: "L",
  5: "R",
  6: "ZL",
  7: "ZR",
  8: "Minus",
  9: "Plus",
  10: "LS",
  11: "RS",
  12: "D-Pad Up",
  13: "D-Pad Down",
  14: "D-Pad Left",
  15: "D-Pad Right",
  16: "Home"
};

const DEFAULT_AXIS_NAMES = {
  0: "Left Stick X",
  1: "Left Stick Y",
  2: "Right Stick X",
  3: "Right Stick Y"
};

function getControllerFamily(gamepadId = "") {
  const id = String(gamepadId || "").toLowerCase();
  if (id.includes("xbox")) {
    return "xbox";
  }
  if (id.includes("dualshock") || id.includes("dualsense") || id.includes("playstation")) {
    return "playstation";
  }
  if (id.includes("nintendo") || id.includes("switch") || id.includes("joy-con") || id.includes("joycon")) {
    return "nintendo";
  }
  if (id.includes("logitech")) {
    return "logitech";
  }
  if (id.includes("8bitdo")) {
    return "8bitdo";
  }
  return "generic";
}

export function getGamepadType(gamepadId = "") {
  switch (getControllerFamily(gamepadId)) {
    case "xbox":
      return "Xbox";
    case "playstation":
      return "PlayStation";
    case "nintendo":
      return "Nintendo";
    case "logitech":
      return "Logitech";
    case "8bitdo":
      return "8BitDo";
    default:
      return "Generic";
  }
}

export function getButtonName(buttonIndex, gamepadId = "") {
  const index = Number(buttonIndex || 0);
  const family = getControllerFamily(gamepadId);
  if (family === "xbox") {
    return XBOX_BUTTON_NAMES[index] || `Button ${index}`;
  }
  if (family === "playstation") {
    return PLAYSTATION_BUTTON_NAMES[index] || `Button ${index}`;
  }
  if (family === "nintendo") {
    return NINTENDO_BUTTON_NAMES[index] || `Button ${index}`;
  }
  return XBOX_BUTTON_NAMES[index] || `Button ${index}`;
}

export function getAxisName(axisIndex, _gamepadId = "") {
  const index = Number(axisIndex || 0);
  return DEFAULT_AXIS_NAMES[index] || `Axis ${index}`;
}

export function formatAxisValue(value) {
  const numeric = Number(value || 0);
  return numeric.toFixed(2);
}

export function formatButtonValue(value) {
  const numeric = Number(value || 0);
  return numeric.toFixed(2);
}
