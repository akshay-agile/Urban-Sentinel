function shouldScheduleLocalNotification(event, userId) {
  return (
    event?.type === 'notification_created' &&
    event?.channel === 'local' &&
    event?.user_id === userId
  );
}

module.exports = shouldScheduleLocalNotification;
