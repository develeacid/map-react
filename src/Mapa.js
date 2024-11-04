import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj"; // Importa la función useGeographic
import datos from "./denue_inegi_20_.json"; // Importa el JSON

function Mapa() {
  const mapRef = useRef();

  useGeographic(); // Llama a useGeographic aquí, fuera del useEffect

  useEffect(() => {
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource({
            features: new GeoJSON().readFeatures(datos), // Lee las features del JSON
          }),
        }),
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Centro en Oaxaca
        zoom: 7, // Zoom para mostrar el estado de Oaxaca
      }),
    });

    return () => map.setTarget(undefined); // Limpiar el mapa al desmontar
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
}

export default Mapa;
