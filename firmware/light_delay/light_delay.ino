// Light Delay hardware checkpoint: Grove rotary A0, button D2, SG-5010 signal D9.
// USB power was tested only with the servo unloaded. Use an appropriate separate
// servo supply and common ground before adding a phone or other load.
#include <Servo.h>
#include <Wire.h>
#include <rgb_lcd.h>  // Seeed Studio Grove LCD RGB Backlight library
#include <stdlib.h>
#include <errno.h>

Servo pan;
rgb_lcd lcd;
const uint8_t KNOB_PIN = A0;
const uint8_t BUTTON_PIN = 2;
const uint8_t SERVO_PIN = 9;
const int SERVO_CENTER = 90;  // Verify physical centre with no load.
// Teammate observed -20 moving right and +20 moving left with +1; invert it.
const int SERVO_SIGN = -1;
const int MAX_PAN_DEG = 30;

char line[40];
uint8_t used = 0;
bool dropping = false;
unsigned long lastTelemetry = 0;

void showTargetOnLcd(int angle) {
  lcd.setCursor(0, 0);
  lcd.print("LIGHT DELAY     ");
  lcd.setCursor(0, 1);
  lcd.print("                ");
  lcd.setCursor(0, 1);
  lcd.print("AIM ");
  if (angle >= 0) lcd.print('+');
  lcd.print(angle);
  lcd.print(" DEG");
}

void processLine(char *input) {
  if (input[0] != 'S' || input[1] != ',') return;
  char *end;
  errno = 0;
  long sequence = strtol(input + 2, &end, 10);
  if (errno || end == input + 2 || *end != ',' || sequence <= 0) return;
  char *angleStart = end + 1;
  errno = 0;
  long angle = strtol(angleStart, &end, 10);
  if (errno || end == angleStart || *end != '\0' || angle < -MAX_PAN_DEG || angle > MAX_PAN_DEG) return;
  int servoAngle = SERVO_CENTER + SERVO_SIGN * (int)angle;
  if (servoAngle < 60 || servoAngle > 120) return;
  pan.write(servoAngle);
  Serial.print("A,"); Serial.print(sequence); Serial.print(','); Serial.println(angle);
  showTargetOnLcd((int)angle);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT);  // Grove button: HIGH when pressed.
  pan.attach(SERVO_PIN);
  pan.write(SERVO_CENTER);
  lcd.begin(16, 2);
  lcd.setRGB(25, 170, 150);
  showTargetOnLcd(0);
  Serial.println("READY,1");
}

void loop() {
  uint8_t budget = 64;
  while (budget-- && Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      if (!dropping && used > 0) {
        if (line[used - 1] == '\r') --used;
        line[used] = '\0';
        processLine(line);
      }
      used = 0;
      dropping = false;
    } else if (!dropping) {
      if ((c < 32 && c != '\r') || used >= sizeof(line) - 1) dropping = true;
      else line[used++] = c;
    }
  }
  unsigned long now = millis();
  if ((unsigned long)(now - lastTelemetry) >= 20) {
    lastTelemetry = now;
    Serial.print("K,"); Serial.print(analogRead(KNOB_PIN));
    Serial.print(','); Serial.println(digitalRead(BUTTON_PIN) == HIGH ? 1 : 0);
  }
}
