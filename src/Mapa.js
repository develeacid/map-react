import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import Cluster from "ol/source/Cluster";
import { Style, Icon, Text, Fill } from "ol/style";
import datos from "./denue_inegi_20_.json";

function Mapa() {
  const mapRef = useRef();

  useGeographic();

  useEffect(() => {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const clusterSource = new Cluster({
      distance: 40,
      source: vectorSource,
    });

    const clusterStyle = (feature) => {
      const size = feature.get("features").length;
      if (size > 1) {
        return new Style({
          image: new Icon({
            src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            scale: 0.05,
          }),
          text: new Text({
            text: size.toString(),
            font: "bold 14px sans-serif",
            fill: new Fill({ color: "#000" }),
            offsetY: -10,
          }),
        });
      } else {
        return new Style({
          image: new Icon({
            src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            scale: 0.05,
          }),
        });
      }
    };

    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: clusterStyle,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        clusterLayer,
      ],
      view: new View({
        center: [-96.769722, 17.066167],
        zoom: 7,
      }),
    });

    // Limpiar el mapa de manera completa al desmontar el componente
    return () => {
      if (map) {
        map.setTarget(null); // Quitar el target del mapa
        map.getLayers().clear(); // Remover todas las capas del mapa
        map.dispose(); // Disponer del mapa si es necesario (opcional en versiones de OL > 6.0)
      }
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
}

export default Mapa;
