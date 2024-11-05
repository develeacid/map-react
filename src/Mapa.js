import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import datos from "./denue_inegi_20_.json";
import { Style, Icon } from "ol/style";
import Overlay from "ol/Overlay";

function Mapa() {
  const mapRef = useRef();
  const popupRef = useRef();

  useGeographic();

  useEffect(() => {
    // Estilo personalizado para los puntos
    const pointStyle = new Style({
      image: new Icon({
        src: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // URL del ícono personalizado
        scale: 0.05, // Tamaño del ícono
      }),
    });

    // Capa de vectores con el estilo personalizado
    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(datos),
      }),
      style: pointStyle,
    });

    // Capa base
    const tileLayer = new TileLayer({
      source: new OSM(),
    });

    // Crear el mapa
    const map = new Map({
      target: mapRef.current,
      layers: [tileLayer, vectorLayer],
      view: new View({
        center: [-96.769722, 17.066167],
        zoom: 7,
      }),
    });

    // Crear overlay para los popups
    const popupOverlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      stopEvent: false,
      offset: [0, -10],
    });
    map.addOverlay(popupOverlay);

    // Manejador de clic para mostrar popup
    map.on("click", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      if (feature) {
        const coords = feature.getGeometry().getCoordinates();
        popupOverlay.setPosition(coords);

        // Extraer los datos del JSON para el popup
        const properties = feature.getProperties();
        const nombreEstab = properties.nom_estab || "Sin nombre";
        const actividad = properties.nombre_act || "Actividad no especificada";
        const perOcupadas = properties.per_ocu || "No especificado";
        const municipio = properties.municipio || "No especificado";
        const localidad = properties.localidad || "No especificado";

        // Crear el contenido del popup
        popupRef.current.innerHTML = `
          <div style="font-size: 14px;">
            <strong>${nombreEstab}</strong><br/>
            <em>${actividad}</em><br/>
            <strong>Personal ocupado:</strong> ${perOcupadas}<br/>
            <strong>Municipio:</strong> ${municipio}<br/>
            <strong>Localidad:</strong> ${localidad}
          </div>
        `;
      } else {
        popupOverlay.setPosition(undefined);
      }
    });

    return () => map.setTarget(undefined); // Limpiar el mapa al desmontar
  }, []);

  return (
    <>
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />
      <div
        ref={popupRef}
        style={{
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 10px rgba(0,0,0,0.5)",
          minWidth: "150px",
        }}
      />
    </>
  );
}

export default Mapa;
