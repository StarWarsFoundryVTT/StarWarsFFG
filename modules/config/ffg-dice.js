export const pool_results = {
  success: "SWFFG.RollResultSuccess",
  failure: "SWFFG.RollResultFailure",
  advantage: "SWFFG.RollResultAdvantage",
  threat: "SWFFG.RollResultThreat",
  triumph: "SWFFG.RollResultTriumph",
  despair: "SWFFG.RollResultDespair",
  light: "SWFFG.RollResultLight",
  dark: "SWFFG.RollResultDark",
};

export function configureDice() {
  // Set up dice with dynamic dice theme
  const dicetheme = game.settings.get("starwarsffg", "dicetheme");
  CONFIG.FFG.theme = dicetheme;

  CONFIG.FFG.PROFICIENCY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/yellow.png`;
  CONFIG.FFG.ABILITY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/green.png`;
  CONFIG.FFG.CHALLENGE_ICON = `systems/starwarsffg/images/dice/${dicetheme}/red.png`;
  CONFIG.FFG.DIFFICULTY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/purple.png`;
  CONFIG.FFG.BOOST_ICON = `systems/starwarsffg/images/dice/${dicetheme}/blue.png`;
  CONFIG.FFG.SETBACK_ICON = `systems/starwarsffg/images/dice/${dicetheme}/black.png`;
  CONFIG.FFG.REMOVESETBACK_ICON = `systems/starwarsffg/images/dice/${dicetheme}/black-minus.png`;
  CONFIG.FFG.FORCE_ICON = `systems/starwarsffg/images/dice/${dicetheme}/whiteHex.png`;

  CONFIG.FFG.ABILITY_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/green.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.OneSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/greens.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.OneSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/greens.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.TwoSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/greenss.png`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.OneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/greena.png`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/greena.png`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: "SWFFG.DiceResult.OneSuccessOneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/greensa.png`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: "SWFFG.DiceResult.TwoAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/greenaa.png`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.BOOST_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/blue.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/blue.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.OneSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/blues.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.OneSuccessOneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/bluesa.png`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.TwoAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/blueaa.png`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/bluea.png`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.CHALLENGE_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/red.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.OneFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/redf.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.OneFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/redf.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.TwoFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/redff.png`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.TwoFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/redff.png`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redt.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redt.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: "SWFFG.DiceResult.OneFailureOneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redft.png`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    9: { label: "SWFFG.DiceResult.OneFailureOneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redft.png`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    10: { label: "SWFFG.DiceResult.TwoThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redtt.png`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    11: { label: "SWFFG.DiceResult.TwoThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/redtt.png`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    12: { label: "SWFFG.DiceResult.OneDespair", image: `systems/starwarsffg/images/dice/${dicetheme}/redd.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 1, light: 0, dark: 0 },
  };

  CONFIG.FFG.DIFFICULTY_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/purple.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.OneFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/purplef.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.TwoFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/purpleff.png`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/purplet.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/purplet.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/purplet.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: "SWFFG.DiceResult.TwoThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/purplett.png`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: "SWFFG.DiceResult.OneFailureOneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/purpleft.png`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.FORCE_RESULTS = {
    1: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    2: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    3: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    4: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    5: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    6: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whiten.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    7: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitenn.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 2 },
    8: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitel.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
    9: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitel.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
    10: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitell.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
    11: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitell.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
    12: { label: "", image: `systems/starwarsffg/images/dice/${dicetheme}/whitell.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
  };

  CONFIG.FFG.PROFICIENCY_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/yellow.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.OneSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/yellows.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.OneSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/yellows.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.TwoSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowss.png`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.TwoSuccess", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowss.png`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowa.png`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: "SWFFG.DiceResult.OneSuccessOneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: "SWFFG.DiceResult.OneSuccessOneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    9: { label: "SWFFG.DiceResult.OneSuccessOneAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    10: { label: "SWFFG.DiceResult.TwoAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowaa.png`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    11: { label: "SWFFG.DiceResult.TwoAdvantage", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowaa.png`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    12: { label: "SWFFG.DiceResult.OneTriumph", image: `systems/starwarsffg/images/dice/${dicetheme}/yellowr.png`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 1, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.SETBACK_RESULTS = {
    1: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/black.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: "SWFFG.DiceResult.Blank", image: `systems/starwarsffg/images/dice/${dicetheme}/black.png`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: "SWFFG.DiceResult.OneFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/blackf.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: "SWFFG.DiceResult.OneFailure", image: `systems/starwarsffg/images/dice/${dicetheme}/blackf.png`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/blackt.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: "SWFFG.DiceResult.OneThreat", image: `systems/starwarsffg/images/dice/${dicetheme}/blackt.png`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  };
}
