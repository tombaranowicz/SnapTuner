import React from 'react';
import Share from 'react-native-share';
import {Pressable} from 'react-native';
import {useWindowDimensions} from 'react-native';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import Canvas, {CanvasRenderingContext2D} from 'react-native-canvas';
import {Image as CanvasImage} from 'react-native-canvas';
import {
  GradientBackground1,
  GradientBackground1_Base64,
  GradientBackground2,
  GradientBackground2_Base64,
  GradientBackground3,
  GradientBackground3_Base64,
  GradientBackground4,
  GradientBackground4_Base64,
  GradientBackground5,
  GradientBackground5_Base64,
  GradientBackground6,
  GradientBackground6_Base64,
} from './images';
import {Slider} from '@miblanchard/react-native-slider';
import {launchImageLibrary} from 'react-native-image-picker';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import ImgToBase64 from 'react-native-image-base64';

var RNFS = require('react-native-fs');

type CanvasProportions = {
  widthRatio: number;
  heightRatio: number;
};

const gradients = [
  {original: GradientBackground1, base64: GradientBackground1_Base64},
  {original: GradientBackground2, base64: GradientBackground2_Base64},
  {original: GradientBackground3, base64: GradientBackground3_Base64},
  {original: GradientBackground4, base64: GradientBackground4_Base64},
  {original: GradientBackground5, base64: GradientBackground5_Base64},
  {original: GradientBackground6, base64: GradientBackground6_Base64},
];

const THEME_COLOR = '#2089dc';
const DEBOUNCE_DELAY = 150;

function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedValue(value),
      delay || DEBOUNCE_DELAY,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

function App(): JSX.Element {
  const containerRef = React.useRef<View>(null);
  const canvasRef = React.useRef<Canvas>(null);

  const {height, width} = useWindowDimensions();

  const isDarkMode = useColorScheme() === 'dark';

  const [cornerRadius, setCornerRadius] = React.useState<number>(15);
  const debouncedRadius = useDebounce<number>(cornerRadius);

  const [margin, setMargin] = React.useState<number>(20);
  const debouncedMargin = useDebounce<number>(margin);

  const [padding, setPadding] = React.useState<number>(0);
  const debouncedPadding = useDebounce<number>(padding);

  const [shadow, setShadow] = React.useState<number>(5);
  const debouncedShadow = useDebounce<number>(shadow);

  const [canvasProportions, setCanvasProportions] =
    React.useState<CanvasProportions>({
      widthRatio: 1,
      heightRatio: 1,
    });

  const [gradientIndex, setGradientIndex] = React.useState<number>(0);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    fontColor: isDarkMode ? Colors.lighter : Colors.darker,
  };

  const [screenshot, setScreenshot] = React.useState<string | undefined>();

  React.useEffect(() => {
    ReceiveSharingIntent.getReceivedFiles(
      (data: any) => {
        const path = data[0].filePath;

        ImgToBase64.getBase64String(path)
          .then(base64String => {
            setScreenshot(`data:image/png;base64,${base64String}`);
          })
          .catch(err => {
            console.log(err);
          });
      },
      (err: any) => {
        console.log(err);
      },
    );

    return () => {
      ReceiveSharingIntent.clearReceivedFiles();
    };
  }, []);

  React.useEffect(() => {
    if (canvasRef && canvasRef.current) {
      handleCanvas(canvasRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasRef,
    debouncedRadius,
    debouncedPadding,
    debouncedMargin,
    debouncedShadow,
    screenshot,
    canvasProportions,
    gradientIndex,
  ]);

  const drawImageContainer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = 'white';
    ctx.shadowColor = 'gray';
    ctx.shadowBlur = shadow;
    ctx.fill();
  };

  const drawBackground = async (canvas: Canvas) => {
    const promise = new Promise<void>((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      const background = new CanvasImage(canvas);
      background.src = gradients[gradientIndex].base64;

      background.addEventListener('load', () => {
        const imageWidth = canvas.width;
        const imageHeight = imageWidth;
        ctx.drawImage(background, 0, 0, imageWidth, imageHeight);
        resolve();
      });
    });
    return promise;
  };

  const drawScreenshot = async (canvas: Canvas) => {
    const promise = new Promise<void>((resolve, reject) => {
      if (screenshot) {
        const ctx = canvas.getContext('2d');
        const image = new CanvasImage(canvas);
        image.src = screenshot;

        image.addEventListener('load', () => {
          // Jesus it's overengineered :D
          const imageContainerWidth = canvas.width - 2 * margin;
          const imageContainerHeight = canvas.height - 2 * margin;

          const r = Math.min(
            imageContainerWidth / image.width,
            imageContainerHeight / image.height,
          );
          const scaledImageWidth = image.width * r;
          const scaledImageHeight = image.height * r;

          const marginX = (canvas.width - scaledImageWidth) / 2;
          const marginY = (canvas.height - scaledImageHeight) / 2;

          ctx.save();
          drawImageContainer(
            ctx,
            marginX,
            marginY,
            scaledImageWidth,
            scaledImageHeight,
            cornerRadius,
          );

          ctx.clip();

          const innerImageWidth = scaledImageWidth - 2 * padding;
          const innerImageHeight = scaledImageHeight - 2 * padding;

          const r2 = Math.min(
            innerImageWidth / image.width,
            innerImageHeight / image.height,
          );
          const imageWidth = image.width * r2;
          const imageHeight = image.height * r2;

          const paddingX = (scaledImageWidth - imageWidth) / 2;
          const paddingY = (scaledImageHeight - imageHeight) / 2;

          ctx.shadowBlur = 0;
          // drawImageProp(ctx, image, margin + padding, margin + padding, imageWidth, imageHeight);
          ctx.drawImage(
            image,
            marginX + paddingX,
            marginY + paddingY,
            imageWidth,
            imageHeight,
          );
          ctx.restore();
          resolve();
        });
      } else {
        reject();
      }
    });
    return promise;
  };

  const handleCanvas = async (canvas: Canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = width * canvasProportions.widthRatio;
    canvas.height = width * canvasProportions.heightRatio;

    //Background
    await drawBackground(canvas);

    //Screenshot
    if (screenshot) {
      await drawScreenshot(canvas);
    }
  };

  const shareSingleImage = async (imageURL: string) => {
    const shareOptions = {
      title: 'Share file',
      url: imageURL,
      failOnCancel: false,
    };

    try {
      const ShareResponse = await Share.open(shareOptions);
      console.log('Result =>', ShareResponse);
      // console.log(JSON.stringify(ShareResponse, null, 2));
    } catch (error) {
      console.log('Error =>', error);
      // setResult('error: '.concat(getErrorString(error)));
    }
  };

  const gradientButton = (index: number) => {
    return (
      <Pressable
        onPressOut={async () => {
          setGradientIndex(index);
        }}
        style={styles.gradientButton}>
        <Image
          source={gradients[index].original}
          style={styles.gradientButton}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={backgroundStyle.backgroundColor}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View ref={containerRef} style={styles.canvasContainer}>
        <Canvas style={styles.canvasStyle} ref={canvasRef} />
      </View>
      <View style={{flexDirection: 'row', marginHorizontal: 10}}>
        <View style={styles.sliderContainer}>
          <Text
            style={{
              color: backgroundStyle.fontColor,
            }}>{`Corner radius ${cornerRadius}`}</Text>
          <Slider
            value={cornerRadius}
            onValueChange={value => setCornerRadius(value[0])}
            minimumValue={0}
            maximumValue={50}
            step={1}
            thumbTintColor={THEME_COLOR}
            minimumTrackTintColor={THEME_COLOR}
          />
        </View>
        <View style={styles.sliderContainer}>
          <Text
            style={{
              color: backgroundStyle.fontColor,
            }}>{`Padding ${padding}`}</Text>
          <Slider
            value={padding}
            onValueChange={value => setPadding(value[0])}
            minimumValue={0}
            maximumValue={50}
            step={1}
            thumbTintColor={THEME_COLOR}
            minimumTrackTintColor={THEME_COLOR}
          />
        </View>
      </View>

      <View style={{flexDirection: 'row', marginHorizontal: 10}}>
        <View style={styles.sliderContainer}>
          <Text
            style={{
              color: backgroundStyle.fontColor,
            }}>{`Margin ${margin}`}</Text>
          <Slider
            value={margin}
            onValueChange={value => setMargin(value[0])}
            minimumValue={0}
            maximumValue={50}
            step={1}
            thumbTintColor={THEME_COLOR}
            minimumTrackTintColor={THEME_COLOR}
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text
            style={{
              color: backgroundStyle.fontColor,
            }}>{`Shadow ${shadow}`}</Text>
          <Slider
            value={shadow}
            onValueChange={value => setShadow(value[0])}
            minimumValue={0}
            maximumValue={150}
            step={1}
            thumbTintColor={THEME_COLOR}
            minimumTrackTintColor={THEME_COLOR}
          />
        </View>
      </View>

      <View style={styles.horizontalButtonsContainer}>
        <Pressable
          onPressOut={async () => {
            setCanvasProportions({
              widthRatio: 1,
              heightRatio: 1,
            });
          }}
          style={styles.proportionButton}>
          <Text style={{color: 'white'}}>{`1:1`}</Text>
        </Pressable>
        <Pressable
          onPressOut={async () => {
            setCanvasProportions({
              widthRatio: 1,
              heightRatio: 0.75,
            });
          }}
          style={styles.proportionButton}>
          <Text style={{color: 'white'}}>{`4:3`}</Text>
        </Pressable>
        <Pressable
          onPressOut={async () => {
            setCanvasProportions({
              widthRatio: 1,
              heightRatio: 0.66,
            });
          }}
          style={styles.proportionButton}>
          <Text style={{color: 'white'}}>{`3:2`}</Text>
        </Pressable>
        <Pressable
          onPressOut={async () => {
            setCanvasProportions({
              widthRatio: 1,
              heightRatio: 0.5625,
            });
          }}
          style={styles.proportionButton}>
          <Text style={{color: 'white'}}>{`16:9`}</Text>
        </Pressable>
      </View>

      <View style={styles.horizontalButtonsContainer}>
        {gradientButton(0)}
        {gradientButton(1)}
        {gradientButton(2)}
        {gradientButton(3)}
        {gradientButton(4)}
        {gradientButton(5)}
      </View>

      <View style={styles.horizontalButtonsContainer}>
        <Pressable
          onPressOut={async () => {
            const canvas = canvasRef.current as Canvas;
            const base64 = await canvas.toDataURL();

            var Base64Code = base64.split('data:image/png;base64,');
            var path = RNFS.DocumentDirectoryPath + '/screenshot.png';

            // write the file
            await RNFS.writeFile(path, Base64Code[1], 'base64');
            shareSingleImage(path);
          }}
          style={styles.actionButton}>
          <Text style={{color: 'white'}}>{`Share Image`}</Text>
        </Pressable>
        <Pressable
          onPressOut={async () => {
            // You can also use as a promise without 'callback':
            const result = await launchImageLibrary({
              mediaType: 'photo',
              includeBase64: true,
            });

            if (result.assets && result.assets.length > 0) {
              setScreenshot(`data:image/png;base64,${result.assets[0].base64}`);
              // console.log(`GOT RESULT ${result.assets[0].base64}`);
            }
          }}
          style={styles.actionButton}>
          <Text style={{color: 'white'}}>{`Pick Image`}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  proportionButton: {
    height: 50,
    width: 50,
    backgroundColor: THEME_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderRadius: 10,
  },
  gradientButton: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  horizontalButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 10,
    justifyContent: 'space-evenly',
  },
  actionButton: {
    height: 50,
    backgroundColor: THEME_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderRadius: 10,
    flex: 1,
  },
  sliderContainer: {flexDirection: 'column', flex: 1, marginLeft: 10},
  canvasStyle: {
    position: `absolute`,
    left: 0,
    top: 0,
  },
  canvasContainer: {width: '100%', aspectRatio: 1, marginBottom: 10},
});

export default App;

// TODO
// - logo/copyright text
