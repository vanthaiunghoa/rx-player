import React from "react";

/**
 * React Component which Displays an Image tip centered and on top of the
 * position wanted.
 *
 * Takes the following props:
 *   - {string} [className=""] - An optional className for the image
 *   - {Uint8Array} Image - The image to display
 *   - {string} mimeType - The mimeType of the image
 *   - {Number} xPosition - The position on the horizontal axis where you
 *     want the image to be centered to.
 *
 * @class ImageTip
 */
class ImageTip extends React.Component {

  /**
   * @param {Object} nextProps
   * @param {Object} prevState
   * @returns {Object|null}
   */
  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      image,
      mimeType,
      xPosition,
    } = nextProps;
    if (
      prevState.currentImage === image &&
      prevState.currentMimeType === mimeType
    ) {
      return prevState.currentXPosition !== xPosition ?
        {
          currentXPosition: xPosition,
          imageStyle: {},
          positionIsCorrected: false,
        } : null;
    }

    if (prevState.currentImageURL != null) {
      URL.revokeObjectURL(prevState.currentImageURL);
    }

    const newURL = createImageURL(image, mimeType);

    return {
      currentImage: image,
      currentImageURL: newURL,
      currentMimeType: mimeType,
      currentXPosition: xPosition,
      imageStyle: {},
      positionIsCorrected: false,
    };
  }

  constructor(...args) {
    super(...args);
    const {
      image,
      mimeType,
      xPosition,
    } = this.props;
    this.state = {
      currentImage: image,
      currentImageURL: createImageURL(image),
      currentMimeType: mimeType,
      currentXPosition: xPosition,
      imageStyle: {},
      positionIsCorrected: false,
    };
  }

  /**
   * @param {Object} nextProps
   */
  componentWillReceiveProps(nextProps) {
    // TODO remove function when switched to >= React16.3
    const newState = ImageTip.getDerivedStateFromProps(nextProps, this.state);
    if (newState !== null) {
      this.setState(newState) ;
    }
  }

  componentWillUnmount() {
    if (this.state.currentImageURL != null) {
      URL.revokeObjectURL(this.state.currentImageURL);
    }
  }

  componentDidMount() {
    this.correctImagePosition();
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  correctImagePosition() {
    if (this.state.positionIsCorrected) {
      return;
    }

    const { xPosition } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const imageStyle = {
      transform: `translate(${xPosition}px, -120px)`,
    };

    this.setState({
      imageStyle,
      positionIsCorrected: true,
    });
  }

  /**
   * @returns {Object}
   */
  render() {
    const { className = "" } = this.props;
    const {
      imageStyle,
      currentImageURL,
    } = this.state;

    return (
      <div
        className="image-tip-wrapper"
        style={imageStyle}
        ref={el => this.element = el}
      >
        <img
          className={"image-tip " + className}
          src={currentImageURL}
        />
      </div>
    );
  }
}

/**
* /!\ Allocate an URL for your image, don't forget to revoke it.
 * @param {Uint8Array} image
 * @param {string} mimeType
 * @returns {string}
 */
function createImageURL(image, mimeType) {
  const blob = new Blob([image], { type: mimeType });
  const url = URL.createObjectURL(blob);
  return url;
}

export default ImageTip;
