/* eslint-disable no-inner-declarations */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { handleError, handleLoading } from '../services/handlerService';
import Wrapper from '../Wrapper/Wrapper';

let mediaStream = null;
let videoUnmount = null;
let unmoutRenderLoop = null;
const failureMsgDefault = {
  unSupported: 'Face Detector is not supporting in your device',
  streamingFailed: 'Camera streaming failed',
  barCodeDetectionFailed: 'Bar code detection failed',
  flashUnsupported: 'Flash is not supporting in your device',
};

function FaceDetectorInit({
  successCb,
  failureCb,
  loadingCb,
  successMsg,
  failureMsg,
  cameraType,
  zIndex,
  children,
}) {
  const failureMsgMerge = { ...failureMsgDefault, ...failureMsg };
  let list = null;
  let video = null;
  let facingMode;

  const [flash, setFlash] = useState(false);
  const [isBrowser, setIsBrowser] = useState(false);
  const [faces, setFaces] = useState([]);

  const stopStreaming = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  };

  const allClear = () => {
    cancelAnimationFrame(videoUnmount);
    stopStreaming();
    clearTimeout(unmoutRenderLoop);
  };

  const detectCodes = async () => {
    const WindowFaceDetector = globalThis.FaceDetector;
    const faceDetector = new WindowFaceDetector();

    // eslint-disable-next-line consistent-return
    async function render() {
      try {
        const getFaces = await faceDetector.detect(video);

        if (getFaces[0]) {
          setFaces(getFaces);
          // cancelAnimationFrame(videoUnmount);
          // stopStreaming();
          // clearTimeout(unmoutRenderLoop);
        }
      } catch (error) {
        return handleError({ msgType: 'BAR_CODE_DETECTION_FAILED', msg: failureMsgMerge.barCodeDetectionFailed || JSON.stringify(error), failureCb });
      }
    }

    unmoutRenderLoop = setTimeout(() => {
      (function renderLoop() {
        videoUnmount = requestAnimationFrame(() => {
          setTimeout(renderLoop, 1500);
        });
        render();
      }());
    }, 100);
  };

  const createVideo = async (id) => {
    document.getElementById('streaming-video')?.remove();

    video = document.createElement('video');

    video.id = 'streaming-video';
    video.srcObject = mediaStream;
    video.autoplay = true;
    video.play();
    // video.style.width = '100vh';
    // video.style.height = '100%';
    video.style.position = 'absolute';
    // video.style.overflow = 'hidden';
    // video.style.display = 'block';
    video.style.zIndex = zIndex;
    video.style.top = '0';
    video.style.left = '0';
    video.style.objectFit = 'fill';
    list = document.getElementById(id);
    list.before(video);
  };

  const startStreaming = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          // deviceId: camera.deviceId,
          facingMode,
          zoom: true,
          resizeMode: true,
          focusDistance: true,
          focusMode: true,
        },
      });
    } catch (error) {
      return handleError({ msgType: 'STREAMING_FAILED', msg: failureMsgMerge.streamingFailed || JSON.stringify(error), failureCb });
    }
    return mediaStream;
  };

  const startVideo = async (id = 'camera') => {
    mediaStream = await startStreaming();
    createVideo(id);
    detectCodes();
  };

  const toggleFlash = async () => {
    const track = mediaStream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flash }],
      });
      setFlash((s) => !s);
    } catch (error) {
      return handleError({ msgType: 'FLASH_UPSUPPORTED', msg: failureMsgMerge.flashUnsupported, failureCb });
    }
    return true;
  };

  const toggleCamera = () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';

    stopStreaming();
    cancelAnimationFrame(videoUnmount);
    clearTimeout(unmoutRenderLoop);
    startVideo();
  };

  const handleBrowserSupport = () => {
    if (FaceDetectorInit.isBrowserSupport()) {
      facingMode = cameraType === 'back' ? 'environment' : 'user';
      handleLoading({ loadingCb });

      startVideo();
    } else {
      return handleError({ msgType: 'UN_SUPPORTED_FEATURE', msg: failureMsgMerge.unSupported, failureCb });
    }

    return true;
  };

  useEffect(() => {
    setIsBrowser(true);
    handleBrowserSupport();

    return () => {
      allClear();
    };
  }, []);

  return isBrowser && FaceDetectorInit.isBrowserSupport() && (
    <div id="face-detector">
      <div id="camera" style={{ position: 'absolute' }} />
      {
        React.Children.map(children, (child) => React.cloneElement(child, {
          zIndex,
          allClear,
          toggleCamera,
          toggleFlash,
          successCb,
          successMsg,
          failureCb,
          failureMsg,
        }))
      }
      {
        faces.map((face) => (
          <div
            className="face"
            style={{
              width: `${face.boundingBox.width}px`,
              height: `${face.boundingBox.height}px`,
              left: `${face.boundingBox.left}px`,
              top: `${face.boundingBox.top}px`,
              position: 'absolute',
              border: '2px solid yellow',
              zIndex: '12',
            }}

          />
        ))
      }
    </div>
  );
}

FaceDetectorInit.isBrowserSupport = () => navigator?.mediaDevices && globalThis.FaceDetector;

FaceDetectorInit.propTypes = {
  successCb: PropTypes.func,
  failureCb: PropTypes.func,
  loadingCb: PropTypes.func,
  successMsg: PropTypes.string,
  failureMsg: PropTypes.object,
  zIndex: PropTypes.number,
  cameraType: PropTypes.oneOf(['back', 'front']),
};

FaceDetectorInit.defaultProps = {
  successCb: () => {},
  failureCb: () => {},
  loadingCb: () => {},
  successMsg: '',
  failureMsg: { ...failureMsgDefault },
  zIndex: 9,
  cameraType: 'back',
};

export default Wrapper(FaceDetectorInit);
