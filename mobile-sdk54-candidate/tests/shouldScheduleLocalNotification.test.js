const test = require('node:test');
const assert = require('node:assert/strict');

const shouldScheduleLocalNotification = require('../src/notifications/shouldScheduleLocalNotification');

test('local channel schedules once for the addressed recipient', () => {
  assert.equal(
    shouldScheduleLocalNotification(
      { type: 'notification_created', channel: 'local', user_id: 7 },
      7,
    ),
    true,
  );
});

test('FCM channel is not mirrored as a local notification', () => {
  assert.equal(
    shouldScheduleLocalNotification(
      { type: 'notification_created', channel: 'fcm', user_id: 7 },
      7,
    ),
    false,
  );
});

test('events for another user and non-notification events are ignored', () => {
  assert.equal(
    shouldScheduleLocalNotification(
      { type: 'notification_created', channel: 'local', user_id: 8 },
      7,
    ),
    false,
  );
  assert.equal(
    shouldScheduleLocalNotification({ type: 'incident_created', channel: 'local', user_id: 7 }, 7),
    false,
  );
});
