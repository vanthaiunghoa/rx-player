import React from "react";
import { createModule } from "../../lib/vespertine.js";
import ChartDataModule from "../../modules/ChartData.js";
import SmoothChart from "./Temporal.jsx";
import LineChart from "./Line.jsx";

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_CHART_LENGTH = 2000;

class ChartsManager extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      displayBufferSizeChart: false,
      displayBandwidthChart: false,
      displayVideoBitrateChart: false,
      displayAudioBitrateChart: false,
    };

    const { player } = this.props;

    this._subscriptions = [];

    this._bufferSizeModule = createModule(ChartDataModule, {
      maxSize: MAX_CHART_LENGTH,
    });
    this._bandwidthChartModule = createModule(ChartDataModule, {
      initialData: [0],
      maxSize: MAX_CHART_LENGTH,
    });
    this._audioBitrateModule = createModule(ChartDataModule, {
      initialData: [0],
      maxSize: MAX_CHART_LENGTH,
    });
    this._videoBitrateModule = createModule(ChartDataModule, {
      initialData: [0],
      maxSize: MAX_CHART_LENGTH,
    });

    const bandwidthSubscription = player.get$("bandwidth")
      .subscribe(bandwidth => {
        this._bandwidthChartModule.dispatch("ADD_DATA", bandwidth / 0.008);
      });
    this._subscriptions.push(bandwidthSubscription);

    const videoBitrateSubscription = player.get$("videoBitrate")
      .subscribe(videoBitrate => {
        this._videoBitrateModule.dispatch("ADD_DATA", videoBitrate);
      });
    this._subscriptions.push(videoBitrateSubscription);

    const audioBitrateSubscription = player.get$("audioBitrate")
      .subscribe(audioBitrate => {
        this._audioBitrateModule.dispatch("ADD_DATA", audioBitrate);
      });
    this._subscriptions.push(audioBitrateSubscription);

    this._interval = setInterval(() => {
      this._bufferSizeModule.dispatch("ADD_DATA", player.get("bufferGap"));
    }, BUFFER_GAP_REFRESH_TIME);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
    this._bufferSizeModule.destroy();
    this._bandwidthChartModule.destroy();
    this._audioBitrateModule.destroy();
    this._videoBitrateModule.destroy();
  }

  render() {
    const {
      displayBandwidthChart,
      displayBufferSizeChart,
      displayVideoBitrateChart,
      displayAudioBitrateChart,
    } = this.state;

    // const onBandwidthCheckBoxChange = (e) => {
    //   const target = e.target;
    //   const value = target.type === "checkbox" ?
    //     target.checked : target.value;

    //   this.setState({
    //     displayBandwidthChart: value,
    //   });
    // };

    const onBufferSizeCheckBoxChange = (e) => {
      const target = e.target;
      const value = target.type === "checkbox" ?
        target.checked : target.value;

      this.setState({
        displayBufferSizeChart: value,
      });
    };

    // const onAudioBitrateCheckBoxChange = (e) => {
    //   const target = e.target;
    //   const value = target.type === "checkbox" ?
    //     target.checked : target.value;

    //   this.setState({
    //     displayAudioBitrateChart: value,
    //   });
    // };

    // const onVideoBitrateCheckBoxChange = (e) => {
    //   const target = e.target;
    //   const value = target.type === "checkbox" ?
    //     target.checked : target.value;

    //   this.setState({
    //     displayVideoBitrateChart: value,
    //   });
    // };

    return (
      <div className="player-charts">
        <div className="chart-checkboxes">
          <div className="chart-checkbox" >
            Buffer size chart
            <input
              name="displayBufferSizeChart"
              type="checkbox"
              checked={displayBufferSizeChart}
              onChange={onBufferSizeCheckBoxChange}
            />
          </div>
          {
            // TODO
            // <div className="chart-checkbox" >
            //   Video bitrate chart
            //   <input
            //     name="displayLiveGapChart"
            //     type="checkbox"
            //     checked={displayVideoBitrateChart}
            //     onChange={onVideoBitrateCheckBoxChange}
            //   />
            // </div>
            // <div className="chart-checkbox" >
            //   Audio bitrate chart
            //   <input
            //     name="displayLiveGapChart"
            //     type="checkbox"
            //     checked={displayAudioBitrateChart}
            //     onChange={onAudioBitrateCheckBoxChange}
            //   />
            // </div>
            // <div className="chart-checkbox" >
            //   Bandwidth chart
            //   <input
            //     name="displayBandwidthChart"
            //     type="checkbox"
            //     checked={displayBandwidthChart}
            //     onChange={onBandwidthCheckBoxChange}
            //   />
            // </div>
          }
        </div>

        {
          displayBufferSizeChart ?
            <SmoothChart
              label="Buffer Size, in s"
              module={this._bufferSizeModule}
              stepped={false}
            /> : null
        }

        {
          displayBandwidthChart ?
            <LineChart
              module={this._bandwidthChartModule}
              label={"Last calculated Bandwidth, in kBps" +
                  " (might be false when cache is involved)"}
            /> : null
        }

        {
          displayVideoBitrateChart ?
            <SmoothChart
              label="video bitrate"
              module={this._videoBitrateModule}
              stepped={true}
            /> : null
        }

        {
          displayAudioBitrateChart ?
            <SmoothChart
              label="audio bitrate"
              module={this._audioBitrateModule}
              stepped={true}
            /> : null
        }

      </div>
    );
  }
}

export default ChartsManager;
