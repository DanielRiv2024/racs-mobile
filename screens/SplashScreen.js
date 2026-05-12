import React, { useEffect } from "react";
import {
  Image,
  StyleSheet,
} from "react-native";

export default function SplashScreen({ navigation }) {

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Root" }],
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Image
      source={require("../assets/splash.jpeg")}
      style={styles.image}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});