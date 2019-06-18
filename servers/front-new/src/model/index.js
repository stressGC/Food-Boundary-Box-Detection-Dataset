import * as tf from '@tensorflow/tfjs';
import { IMAGENET_CLASSES } from './classes'; 

const GOOGLE_CLOUD_STORAGE_DIR = 'https://storage.googleapis.com/tfjs-models/savedmodel/';
const MODEL_FILE_URL = 'mobilenet_v2_1.0_224/model.json';
const INPUT_NODE_NAME = 'images';
const OUTPUT_NODE_NAME = 'module_apply_default/MobilenetV2/Logits/output';
const PREPROCESS_DIVISOR = tf.scalar(255 / 2);

export class MobileNet {

  async load() {
    this.model = await tf.loadGraphModel(
        GOOGLE_CLOUD_STORAGE_DIR + MODEL_FILE_URL);
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
    }
  }
  /**
   * Infer through MobileNet. This does standard ImageNet pre-processing before
   * inferring through the model. This method returns named activations as well
   * as softmax logits.
   *
   * @param input un-preprocessed input Array.
   * @return The softmax logits.
   */
  predict(input) {
    const preprocessedInput = tf.div(
        tf.sub(input.asType('float32'), PREPROCESS_DIVISOR),
        PREPROCESS_DIVISOR);
    const reshapedInput =
        preprocessedInput.reshape([1, ...preprocessedInput.shape]);
    return this.model.execute(
        {[INPUT_NODE_NAME]: reshapedInput}, OUTPUT_NODE_NAME);
  }

  getTopKClasses(logits, topK) {
    const predictions = tf.tidy(() => {
      return tf.softmax(logits);
    });

    const values = predictions.dataSync();
    predictions.dispose();

    let predictionList = [];
    for (let i = 0; i < values.length; i++) {
      predictionList.push({value: values[i], index: i});
    }
    predictionList = predictionList
                         .sort((a, b) => {
                           return b.value - a.value;
                         })
                         .slice(0, topK);

    return predictionList.map(x => {
      return {label: IMAGENET_CLASSES[x.index], value: x.value};
    });
  }
}
