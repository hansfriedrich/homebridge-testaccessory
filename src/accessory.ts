import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import { hasUncaughtExceptionCaptureCallback } from "process";
import { callbackify } from "util";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("TestWindowBlinds", TestWindowCovering);
};

class TestWindowCovering implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;

  // new model
  protected positionState = 0;
  protected currentPosition = 0;
  protected targetPosition = 0;
  // end new model

  private readonly windowCoveringService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;

    this.windowCoveringService = new hap.Service.WindowCovering(this.name);
    this.windowCoveringService.getCharacteristic(hap.Characteristic.HoldPosition)
      .on(CharacteristicEventTypes.SET, (callback: CharacteristicSetCallback) => {
        log.info("HOLDPOSITION was SET");
      })
    this.windowCoveringService.getCharacteristic(hap.Characteristic.CurrentPosition)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("CurrentPosition of the blind was returned:", this.currentPosition);
        callback(undefined, this.currentPosition);
      })
    this.windowCoveringService.getCharacteristic(hap.Characteristic.PositionState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("PositionState of the blind was returned:" , this.positionState);
        callback(undefined, this.positionState);
      });
    this.windowCoveringService.getCharacteristic(hap.Characteristic.TargetPosition)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("TargetPosition of the blind was returned: ", this.targetPosition);
        callback(undefined, this.targetPosition);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.targetPosition = value as number;
        log.info("Targetposition state was set to:", this.targetPosition);
        
        if (this.targetPosition === this.currentPosition) {
          this.positionState = Characteristic.PositionState.STOPPED;
        }
        else {
          if (this.targetPosition > this.currentPosition){
            this.positionState = Characteristic.PositionState.DECREASING;
          }
          else {
            this.positionState = Characteristic.PositionState.INCREASING;
          }
        }
        this.windowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(this.positionState);
        
        setTimeout(() => {
          this.currentPosition = this.targetPosition;
          this.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.currentPosition);
          this.windowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
          log.info("window covering moved and now has the currentposition of ", this.currentPosition);
        }, 5000)
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Test Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Test Model");

    log.info("WindowBlinds finished initializing!");
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.windowCoveringService,
    ];
  }

}
