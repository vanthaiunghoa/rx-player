import React from "react";

/**
 * @class TimeTip
 */
class TimeTip extends React.Component {
  constructor(...args) {
    super(...args);

    this.positionIsCorrected = false;
    this.state = {
      style: {},
    };
  }

  componentWillReceiveProps(nextProps) {
    this.positionIsCorrected = false;
    const { image } = nextProps;
    if (this.props.image !== image) {
      this.attachBIFImage(image);
    }
  }

  componentWillUnmount() {
  }

  correctImagePosition() {
    if (this.positionIsCorrected) {
      return;
    }
    const { xPosition } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const rect = this.element.getBoundingClientRect();
    const width = rect.width;

    const style = {
      transform: `translate(${xPosition - width/2}px, -40px)`,
    };

    this.positionIsCorrected = true;
    this.setState({ style });
  }

  componentDidMount() {
    this.correctImagePosition();
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  render() {
    const { className = "", text } = this.props;
    const { style } = this.state;
    const date = new Date(text * 1000);
    const hours = (date.getUTCHours() + 2 ).toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const currentReadableHour =  hours + ":" + minutes + ":" + seconds;

    return (
      <div
        className="time-tip-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        <span
          className={"time-tip " + className}
        >{currentReadableHour}</span>
      </div>
    );
  }
}

export default TimeTip;
