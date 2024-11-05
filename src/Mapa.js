import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import { Style, Stroke, Fill, Circle as OlCircle } from "ol/style";  // Asegúrate de importar Circle
import * as turf from "@turf/turf";
import municipiosData from "./municipios_oaxaca.json";  // Importamos el archivo GeoJSON de municipios
import puntosData from "./denue_inegi_20_.json";  // Importamos los datos de puntos del DENUE

function Mapa() {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [municipiosLayer, setMunicipiosLayer] = useState(null);
  const [denueLayer, setDenueLayer] = useState(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState("");
  const [puntosEnMunicipio, setPuntosEnMunicipio] = useState([]);

  useGeographic();

  useEffect(() => {
    // Cargar y procesar los datos de los municipios
    const municipiosSource = new VectorSource({
      features: new GeoJSON().readFeatures(municipiosData),
    });

    const municipiosLayer = new VectorLayer({
      source: municipiosSource,
      style: new Style({
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.3)",
        }),
        stroke: new Stroke({
          color: "#333",
          width: 2,
        }),
      }),
    });

    // Cargar y procesar los puntos del DENUE
    const puntosSource = new VectorSource({
      features: new GeoJSON().readFeatures(puntosData),
    });

    const denueLayer = new VectorLayer({
      source: puntosSource,
      style: new Style({
        image: new OlCircle({
          radius: 5,  // Tamaño del círculo
          fill: new Fill({
            color: "red",  // Color del círculo
          }),
        }),
      }),
    });

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        municipiosLayer,  // Capa de polígonos de municipios
        denueLayer,       // Capa de puntos del DENUE
      ],
      view: new View({
        center: [-96.769722, 17.066167],
        zoom: 9,
      }),
    });

    setMap(initialMap);
    setMunicipiosLayer(municipiosLayer);
    setDenueLayer(denueLayer);

    return () => {
      initialMap.setTarget(null);
      initialMap.getLayers().clear();
      initialMap.dispose();
    };
  }, []);

  const handleMunicipioChange = (event) => {
    const selectedCVEGEO = event.target.value;
    setSelectedMunicipio(selectedCVEGEO);
  
    // Filtrar los puntos dentro del municipio seleccionado
    if (selectedCVEGEO) {
      const municipioFeature = municipiosData.features.find(
        (feature) => feature.properties.CVEGEO === selectedCVEGEO
      );
  
      if (municipioFeature) {
        const municipioGeometry = municipioFeature.geometry; // Extraer solo la geometría
  
        // Verificar si el municipio tiene una geometría válida
        let municipioPolygon;
        if (municipioGeometry.type === "MultiPolygon") {
          // Asegúrate de que cada anillo de los polígonos tenga al menos 4 puntos
          const validCoordinates = municipioGeometry.coordinates.filter(
            (polygon) => polygon[0].length >= 4
          );
  
          if (validCoordinates.length > 0) {
            // Crear el polígono con Turf.js solo si es válido
            municipioPolygon = turf.multiPolygon(validCoordinates);
          } else {
            console.error("Geometría inválida en municipio:", selectedCVEGEO);
            return;
          }
        } else if (municipioGeometry.type === "Polygon") {
          // Verificar que el polígono tenga al menos 4 puntos
          if (municipioGeometry.coordinates[0].length >= 4) {
            municipioPolygon = turf.polygon(municipioGeometry.coordinates);
          } else {
            console.error("Geometría inválida en municipio:", selectedCVEGEO);
            return;
          }
        }
  
        // Filtrar los puntos dentro del municipio seleccionado
        const puntosDentro = puntosData.features.filter((point) => {
          const pointCoords = point.geometry.coordinates;
          const turfPoint = turf.point(pointCoords);
          return turf.booleanPointInPolygon(turfPoint, municipioPolygon);
        });
  
        setPuntosEnMunicipio(puntosDentro);
  
        // Obtener el bounding box del municipio usando OpenLayers
        const municipioExtent = new GeoJSON().readGeometry(municipioGeometry).getExtent();
  
        // Aplicar el zoom al municipio seleccionado
        map.getView().fit(municipioExtent, {
          duration: 1000,  // Duración del zoom
          padding: [50, 50, 50, 50],  // Espaciado alrededor del municipio
        });
      }
    } else {
      setPuntosEnMunicipio([]);
    }
  };

  return (
    <div>
      <select onChange={handleMunicipioChange} value={selectedMunicipio}>
        <option value="">Selecciona un municipio</option>
        {municipiosData.features.map((municipio) => (
          <option key={municipio.properties.CVEGEO} value={municipio.properties.CVEGEO}>
            {municipio.properties.NOMGEO}
          </option>
        ))}
      </select>

      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      {puntosEnMunicipio.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Puntos dentro del municipio:</h3>
          <ul>
            {puntosEnMunicipio.map((point, index) => {
              const propiedades = point.properties;
              return (
                <li key={index}>
                  {propiedades.nom_estab || "Sin nombre"} -{" "}
                  {propiedades.nombre_act || "Actividad desconocida"}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Mapa;
