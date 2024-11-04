import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import { Style, Icon } from "ol/style";
import datos from "./denue_inegi_20_.json";

function Mapa() {
  const mapRef = useRef();

  useGeographic();

  useEffect(() => {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const iconStyle = new Style({
      image: new Icon({
        src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        scale: 0.05,
      }),
    });

    const pointsLayer = new VectorLayer({
      source: vectorSource,
      style: iconStyle,
      visible: false, // Comienza oculto, se mostrará con el zoom adecuado
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        pointsLayer,
      ],
      view: new View({
        center: [-96.769722, 17.066167],
        zoom: 7,
      }),
    });

    // Función para actualizar la visibilidad de los puntos según el nivel de zoom
    const updateVisibility = () => {
      const zoom = map.getView().getZoom();
      pointsLayer.setVisible(zoom >= 12); // Muestra los puntos solo si el zoom es 12 o mayor
    };

    // Suscripción al cambio de resolución para ajustar visibilidad
    map.getView().on("change:resolution", updateVisibility);

    // Llama a la función al inicio para asegurar el estado inicial correcto
    updateVisibility();

    // Limpieza al desmontar
    return () => {
      map.setTarget(null);
      map.getLayers().clear();
      map.dispose();
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
}

export default Mapa;
