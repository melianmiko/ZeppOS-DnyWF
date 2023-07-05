const deviceInfo = hmSetting.getDeviceInfo();
const waveLength = 36;
const colors = [
  [0xFFCDD2, 0xEF9A9A],
  [0xFFE0B2, 0xFFCC80],
  [0xFFF9C4, 0xFFF59D],
  [0xC8E6C9, 0xA5D6A7],
  [0xB3E5FC, 0x81D4FA],
  [0xE1BEE7, 0xCE93D8],
  [0xF8BBD0, 0xF48FB1],
];

const voidLine = {
  padding: 2,
  space: 2,
  start: 0,
  end: 2,
  width: 2,
  count: 0,
  color: 0xFFFFFF
};
const voidText = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  space: 0,
  color: 0xFF,
  data_array: [],
  count: 0
};

// Sensors
const battery = hmSensor.createSensor(hmSensor.id.BATTERY);
const time = hmSensor.createSensor(hmSensor.id.TIME);
const vibrate = hmSensor.createSensor(hmSensor.id.VIBRATE);

export class DnyWatchface {
  constructor() {
    this.lastColorId = 0;
    this.tick = 0;
    this.aodGroup = null;
    this.aodBG = null;

    this.imageWidth = 96;
    this.imageHeight = 114;
    this.alarmHeight = 50;

    this.baseWidth = this.imageWidth * 2;
    this.baseHeight = this.imageHeight * 2 + 12;
    this.offsetX = Math.floor((deviceInfo.width - this.baseWidth) / 2);
    this.offsetY = Math.floor((deviceInfo.height - this.baseHeight) / 2);

    this.demoData = [];
    for (let i = 0; i < 192; i++) {
      this.demoData[i] = 70 + 2 * Math.sin(i / waveLength * Math.PI);
    }

    this.lastTap = 0;
    this.tapCounter = 0;
  }

  build() {
    const isAOD = hmSetting.getScreenType() == hmSetting.screen_type.AOD;

    // Build graph only if not in AOD
    isAOD ? this.makeBgAod() : this.makeBgMain();

    // load fonts
    const numbers = [], alarm = [];
    for (let i = 0; i < 10; i++) {
      numbers.push(`${isAOD ? 'aod' : 'numbers'}/${i}.png`);
      alarm.push(`alarm/${i}.png`);
    }

    // Make widgets
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: this.offsetX,
      y: this.offsetY + this.imageHeight,
      w: this.baseWidth,
      h: 12,
      color: 0
    });
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: this.offsetX,
      y: deviceInfo.height - this.alarmHeight,
      w: this.baseWidth,
      h: this.alarmHeight,
      font_array: alarm,
      padding: 1,
      type: hmUI.data_type.ALARM_CLOCK,
      dot_image: 'alarm/10.png',
      invalid_image: 'alarm/11.png',
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    // Make time + click handler
    hmUI.createWidget(hmUI.widget.IMG_TIME, {
      hour_zero: 1,
      hour_startX: this.offsetX,
      hour_startY: this.offsetY,
      hour_array: numbers,
      minute_zero: 1,
      minute_startX: this.offsetX,
      minute_startY: this.offsetY + this.imageHeight + 12,
      minute_array: numbers,
    }).addEventListener(hmUI.event.CLICK_UP, () => {
      if (Date.now() - this.lastTap > 1000)
        this.tapCounter = 1;

      if (this.tapCounter == 3) {
        vibrate.stop();
        vibrate.scene = 25;
        vibrate.start();

        hmApp.startApp({ url: 'Settings_lightAdjustScreen', native: true });
        this.tapCounter = 0;

        return;
      }

      this.tapCounter++;
      this.lastTap = Date.now();
    })
  }

  makeBgAod() {
    this.aodGroup = hmUI.createWidget(hmUI.widget.GROUP, {
      x: this.offsetX,
      y: this.offsetY,
      w: 192,
      h: this.baseHeight,
    });

    this.refreshAodColor();

    // BG auto update
    timer.createTimer(0, 200000, () => {
      this.refreshAodColor();
    });
  }

  refreshAodColor() {
    const time = hmSensor.createSensor(hmSensor.id.TIME);
    if(time.week - 1 == this.lastColorId) return;

    this.lastColorId = time.week - 1;
    if (this.aodBG) hmUI.deleteWidget(this.aodBG);
    this.aodBG = this.aodGroup.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: this.baseWidth,
      h: this.baseHeight,
      color: colors[this.lastColorId][0]
    });
  }

  makeBgMain() {
    this.mainGroup = hmUI.createWidget(hmUI.widget.GROUP, {
      x: this.offsetX,
      y: this.offsetY,
      w: this.baseWidth,
      h: this.baseHeight,
    });

    // Widgets
    this.refreshMainColor();

    // Check for battery/color change on resume
    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        if (time.week - 1 != this.lastColorId)
          this.refreshMainColor();
      }
    });

    // BG update
    timer.createTimer(0, 5000, () => {
      if (time.week - 1 != this.lastColorId)
        this.refreshMainColor();
    });

    // Animation =)
    timer.createTimer(0, 200, () => {
      if (!this.mainGraph) return;

      const level = battery.current;
      const array = [];
      for (let i = 0; i < this.baseWidth; i++) {
        array[i] = level + 2 * Math.sin((
          this.tick * 4 + i) / waveLength * Math.PI);
      }

      this.mainGraph.setProperty(hmUI.prop.UPDATE_DATA, {
        data_array: array,
        data_count: this.baseWidth
      });
      this.mainBg.setProperty(hmUI.prop.MORE, {
        x: this.tick % 2
      })

      this.tick = this.tick == waveLength ? 0 : this.tick + 1;
    });
  }

  refreshMainColor() {
    this.lastColorId = time.week - 1;

    if (this.mainBg) hmUI.deleteWidget(this.mainBg);
    if (this.mainGraph) hmUI.deleteWidget(this.mainGraph);

    this.mainBg = this.mainGroup.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: this.baseWidth - 1,
      h: this.baseHeight,
      color: colors[this.lastColorId][0]
    });
    this.mainGraph = this.mainGroup.createWidget(hmUI.widget.HISTOGRAM, {
      x: 0,
      y: 0,
      w: this.baseWidth,
      h: this.baseHeight,
      item_width: 1,
      item_space: 0,
      item_radius: 0,
      data_min_value: 0,
      data_max_value: 100,
      data_array: this.demoData,
      data_count: this.baseWidth,
      xline: voidLine,
      yline: voidLine,
      xText: voidText,
      yText: voidText,
      item_color: colors[this.lastColorId][1]
    });
  }
}


WatchFace({
  onInit() {
    new DnyWatchface().build();
  }
})