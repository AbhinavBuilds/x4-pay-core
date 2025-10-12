// ESP32 Serial print test
// Works on ESP32 / ESP32-C3 / ESP32-S3

void setup() {
  Serial.begin(115200);        // USB serial speed
  while (!Serial) { ; }        // (safe on S3/C3; ignored on classic ESP32)
  Serial.println("\nHello from ESP32!");
}

void loop() {
  static unsigned long t0 = millis();
  static unsigned long n  = 0;

  if (millis() - t0 >= 1000) { // every 1 second
    t0 = millis();
    Serial.print("Tick #-------");
    Serial.println(++n);
  }
}
