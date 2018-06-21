import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

function NextProgramButton({
  className = "",
  currentPeriod,
  manifest,
  player,
  position,
}) {
  if (!manifest) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf138)}
      />
    );
  }
  const indexOf = manifest.periods.indexOf(currentPeriod);
  if (indexOf < 0 || indexOf >= manifest.periods.length) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf138)}
      />
    );
  }
  const newPeriod = manifest.periods[indexOf + 1];
  const onClick = function onNextProgramClick() {
    if (
      position >= currentPeriod.start &&
      currentPeriod.end - position <= 4 &&
      indexOf + 2 < manifest.periods.length
    ) {
      player.dispatch("SEEK", manifest.periods[indexOf + 2].start - 4);
    } else {
      player.dispatch("SEEK", newPeriod.start - 4);
    }
  };
  return (
    <Button
      onClick={onClick}
      className={"settings-button " + className}
      disabled={false}
      value={String.fromCharCode(0xf138)}
    />
  );
}

export default withModulesState({
  player: {
    currentPeriod: "currentPeriod",
    currentTime: "position",
    manifest: "manifest",
  },
})(NextProgramButton);
