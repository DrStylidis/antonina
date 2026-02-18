import { registerEmailHandlers } from './emails'
import { registerScheduleHandlers } from './schedule'
import { registerTaskHandlers } from './tasks'
import { registerBriefingHandlers } from './briefing'
import { registerHealthHandlers } from './health'
import { registerSettingsHandlers } from './settings'
import { registerAgentHandlers } from './agent'
import { registerChatHandlers } from './chat'
import { registerGoalsHandlers } from './goals'
import { registerMeetingsHandlers } from './meetings'

export function registerAllHandlers(): void {
  registerSettingsHandlers()
  registerEmailHandlers()
  registerScheduleHandlers()
  registerTaskHandlers()
  registerBriefingHandlers()
  registerHealthHandlers()
  registerAgentHandlers()
  registerChatHandlers()
  registerGoalsHandlers()
  registerMeetingsHandlers()
}
