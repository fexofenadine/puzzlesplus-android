import { load, save } from '../shell/storage'

//imported before the backgrounds, which read their settings as they load
//a screensaver starts with every background moving, classic's clouds too (the web keeps its photo)
//version 2 is the backgrounds' settings version at the time, so nothing of it is dropped
if (load('backgrounds') === null) {
  save('backgrounds', JSON.stringify({ driftclouds: { animated: true }, version: 2 }))
}
