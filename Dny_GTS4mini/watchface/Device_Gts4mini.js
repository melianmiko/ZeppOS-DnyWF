import { DnyWatchface } from "../../Dny";

WatchFace({
  onInit() {
    const wf = new DnyWatchface()
    wf.alarmHeight = 32;
    wf.build();
  }
});
