import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import HeatmapLayer from "ol/layer/Heatmap";
import datos from "./denue_inegi_20_.json";

function Mapa() {
  const mapRef = useRef();

  useGeographic();

  useEffect(() => {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const heatmapLayer = new HeatmapLayer({
      source: vectorSource,
      blur: 15, // Ajusta el valor del desenfoque para una transición más suave
      radius: 8, // Ajusta el tamaño del área de influencia de cada punto
      weight: (feature) => {
        // Asigna peso a cada punto según algún atributo, como el número de empleados (per_ocu) si está disponible
        const perOcu = feature.get("properties")?.per_ocu;
        // Asigna más peso a los puntos con mayor número de empleados
        return perOcu === "0 a 5 personas" ? 0.3 : 0.6;
      },
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        heatmapLayer,
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Centro en Oaxaca
        zoom: 7, // Nivel de zoom inicial
      }),
    });

    // Limpieza completa al desmontar
    return () => {
      map.setTarget(null);
      map.getLayers().clear();
      map.dispose();
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
}

export default Mapa;
