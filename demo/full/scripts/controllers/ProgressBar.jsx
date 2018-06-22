import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import ImageTip from "../components/ImageTip.jsx";
import TimeTip from "../components/TimeIndication.jsx";
import withModulesState from "../lib/withModulesState.jsx";

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      timeTipVisible: false,
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
    };
  }

  showImageTip(ts, clientX) {
    const { images } = this.props;
    if (!images || !images.length) {
      this.setState({
        timeTipVisible: true,
        timeTipPosition: ts,
        imageTipVisible: false,
        imageTipPosition: clientX,
        image: null,
      });
      return;
    }
    const timestampToMs = ts * 1000;
    const imageIndex = images.findIndex(image =>
      image && image.ts > timestampToMs
    );
    const image = imageIndex === -1 ?
      images[images.length - 1] :
      images[imageIndex - 1];
    this.setState({
      timeTipVisible: true,
      imageTipVisible: !!image,
      imageTipPosition: clientX,
      image: image != null ? image.data : null,
    });
  }

  hideImageTip() {
    this.setState({
      timeTipVisible: false,
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
    });
  }

  render() {
    const {
      timeTipVisible,
      timeTipPosition,
      imageTipVisible,
      imageTipPosition,
      image,
    } = this.state;
    const {
      currentTime,
      minimumPosition,
      maximumPosition,
      bufferGap,
      player,
    } = this.props;
    const seek = position => player.dispatch("SEEK", position);
    const onMouseOut = () => this.hideImageTip();
    const onMouseMove = (position, event) => {
      this.showImageTip(position, event.clientX);
    };

    const imageTipOffset = this.wrapperElement ?
      this.wrapperElement.getBoundingClientRect().left : 0;

    return (
      <div
        className="progress-bar-parent"
        ref={el => this.wrapperElement = el}
      >
        { imageTipVisible ?
          <ImageTip
            className="progress-tip"
            image={image}
            xPosition={imageTipPosition - imageTipOffset}
          /> : null
        }
        { timeTipVisible ?
          <TimeTip
            className="progress-tip"
            text={timeTipPosition}
            xPosition={imageTipPosition - imageTipOffset}
          /> : null
        }
        <ProgressbarComponent
          seek={seek}
          onMouseOut={onMouseOut}
          onMouseMove={onMouseMove}
          position={currentTime}
          minimumPosition={minimumPosition}
          maximumPosition={maximumPosition + 60 * 60 * 8 }
          bufferGap={bufferGap}
        />
      </div>
    );
  }
}

export default withModulesState({
  player: {
    bufferGap: "bufferGap",
    currentTime: "currentTime",
    images: "images",
    minimumPosition: "minimumPosition",
    maximumPosition: "maximumPosition",
  },
})(Progressbar);
