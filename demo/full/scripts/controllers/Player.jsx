import React from "react";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { createModule } from "../lib/vespertine.js";
import PlayerModule from "../modules/player";
import ControlBar from "./ControlBar.jsx";
import ContentList from "./ContentList.jsx";
import ErrorDisplayer from "./ErrorDisplayer.jsx";
import PlayerKnobsManager from "./PlayerKnobs.jsx";
import LogDisplayer from "./LogDisplayer.jsx";
import ChartsManager from "./charts/index.jsx";
import withModulesState from "../lib/withModulesState.jsx";

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

class Player extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      player: null,
      displaySpinner: false,
    };

  }

  componentDidMount() {
    const player = createModule(PlayerModule, {
      videoElement: this.videoElement,
      textTrackElement: this.textTrackElement,
      overlayElement: this.overlayElement,
    });

    this._$destroySubject = new Subject();
    this._$destroySubject.subscribe(() => player.destroy());

    player.$get("isSeeking", "isBuffering", "isLoading", "epg")
      .pipe(takeUntil(this._$destroySubject))
      .subscribe(([isSeeking, isBuffering, isLoading, epg]) => {
        this.setState({ epg });
        if (isSeeking || isBuffering || isLoading) {
          this._displaySpinnerTimeout = setTimeout(() => {
            this.setState({
              displaySpinner: true,
            });
          }, SPINNER_TIMEOUT);
        } else {
          if (this._displaySpinnerTimeout) {
            clearTimeout(this._displaySpinnerTimeout);
            this._displaySpinnerTimeout = 0;
          }

          if (this.state.displaySpinner) {
            this.setState({
              displaySpinner: false,
            });
          }
        }

      });

    this.setState({ player });
    // for DEV mode
    window.playerModule = player;
  }

  // will never happen, but still
  componentWillUnmount() {
    if (this._$destroySubject) {
      this._$destroySubject.next();
      this._$destroySubject.complete();
    }
    if (this._displaySpinnerTimeout) {
      clearTimeout(this._displaySpinnerTimeout);
    }
  }

  onVideoClick() {
    const { isPaused, hasLoadedContent } =
      this.state.player.get();

    if (!hasLoadedContent) {
      return;
    }

    this.state.player.dispatch(isPaused ? "PLAY"  : "PAUSE");
  }

  render() {
    const { player, displaySpinner, epg } = this.state;
    const loadVideo = (video) => this.state.player.dispatch("LOAD", video);
    const stopVideo = () => this.state.player.dispatch("STOP");

    return (
      <section className="video-player-section">
        <div className="video-player-content">
          <ContentList
            loadVideo={loadVideo}
            stopVideo={stopVideo}
          />
          <div
            className="video-player-wrapper"
            ref={element => this.playerWrapperElement = element }
          >
            <div
              className="video-wrapper"
              onClick={() => this.onVideoClick()}
            >
              <ErrorDisplayer player={player} />
              {
                displaySpinner ?
                  <img
                    src="./assets/spinner.gif"r
                    className="video-player-spinner"
                  /> : null
              }
              <div
                className="overlay-wrapper"
                ref={element => this.overlayElement = element }
              />
              <div
                className="text-track"
                ref={element => this.textTrackElement = element }
              />
              <video
                ref={element => this.videoElement = element }
              />
            </div>
            {
              player ?
                <ControlBar
                  player={player}
                  videoElement={this.playerWrapperElement}
                /> : null}
          </div>
          {player ?  <PlayerKnobsManager player={player} /> : null}
          {epg && epg.length ? <EpgState epg={epg} player={player} /> : null}
          {player ?  <ChartsManager player={player} /> : null }
          {player ?  <LogDisplayer player={player} /> : null}
        </div>
      </section>
    );
  }
}

function EPG({
  epg,
  player,
  currentTime,
}) {
  const seeker = (startTime) => () => {
    player.dispatch("SEEK", startTime);
  };
  const programs = epg.map((prog) => {
    const date = new Date(prog.startTime * 1000);
    const hours = ((date.getUTCHours() + 2) % 24).toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const currentReadableHour =  hours + ":" + minutes + ":" + seconds;
    const isCurrent = currentTime >= prog.startTime && currentTime < prog.endTime;
    return (
      <div
        className={`epg-program ${isCurrent ? " active" : ""} ${!prog.isAvailable ? " unavailable" : ""}`}
        onClick={seeker(prog.startTime)}
      >
        <span className="epg-program-hours">
          {currentReadableHour}
        </span>
        <span className="epg-program-title">
          {prog.title}
        </span>
      </div>
    );
  });

  return (
    <div className="epg-grid-wrapper">
      <div className="epg-grid">
        {programs}
      </div>
    </div>
  );
}

const EpgState = withModulesState({
  player: {
    currentTime: "currentTime",
  },
})(EPG);

export default Player;
