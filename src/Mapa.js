import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css"; // Importa los estilos de OpenLayers
import { Map, View } from "ol"; // Importa las clases Map y View de OpenLayers
import TileLayer from "ol/layer/Tile"; // Importa la clase TileLayer para capas de teselas
import OSM from "ol/source/OSM"; // Importa la fuente de teselas OpenStreetMap
import VectorLayer from "ol/layer/Vector"; // Importa la clase VectorLayer para capas vectoriales
import VectorSource from "ol/source/Vector"; // Importa la clase VectorSource para fuentes vectoriales
import GeoJSON from "ol/format/GeoJSON"; // Importa el formato GeoJSON para leer datos GeoJSON
import { useGeographic } from "ol/proj"; // Importa la función useGeographic para usar coordenadas geográficas
import { Style, Stroke, Fill, Circle as OlCircle } from "ol/style"; // Importa clases de estilo para las características del mapa, incluyendo Circle
import * as turf from "@turf/turf"; // Importa la biblioteca Turf.js para operaciones geoespaciales
import municipiosData from "./municipios_oaxaca.json"; // Importa los datos GeoJSON de los municipios de Oaxaca
import puntosData from "./denue_inegi_20_.json"; // Importa los datos de puntos del DENUE

function Mapa() {
  const mapRef = useRef(); // Referencia al elemento del mapa
  const [map, setMap] = useState(null); // Estado para almacenar la instancia del mapa
  const [municipiosLayer, setMunicipiosLayer] = useState(null); // Estado para almacenar la capa de municipios
  const [denueLayer, setDenueLayer] = useState(null); // Estado para almacenar la capa de puntos del DENUE
  const [selectedMunicipio, setSelectedMunicipio] = useState(""); // Estado para almacenar el municipio seleccionado
  const [puntosEnMunicipio, setPuntosEnMunicipio] = useState([]); // Estado para almacenar los puntos dentro del municipio seleccionado

  useGeographic(); // Indica a OpenLayers que se utilizarán coordenadas geográficas

  useEffect(() => {
    // Este useEffect se ejecuta solo una vez al montar el componente

    // Cargar y procesar los datos de los municipios
    const municipiosSource = new VectorSource({
      features: new GeoJSON().readFeatures(municipiosData),
    });

    const municipiosLayer = new VectorLayer({
      source: municipiosSource,
      style: new Style({
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.3)", // Color de relleno de los municipios
        }),
        stroke: new Stroke({
          color: "#333", // Color del borde de los municipios
          width: 2, // Ancho del borde de los municipios
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
          // Estilo de círculo para los puntos
          radius: 5, // Radio del círculo
          fill: new Fill({
            color: "red", // Color de relleno del círculo
          }),
        }),
      }),
    });

    // Crea una instancia del mapa de OpenLayers
    const initialMap = new Map({
      target: mapRef.current, // Elemento donde se renderizará el mapa
      layers: [
        new TileLayer({
          source: new OSM(), // Capa base de OpenStreetMap
        }),
        municipiosLayer, // Capa de polígonos de municipios
        denueLayer, // Capa de puntos del DENUE
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Coordenadas del centro inicial
        zoom: 9, // Nivel de zoom inicial
      }),
    });

    setMap(initialMap); // Guarda la instancia del mapa en el estado
    setMunicipiosLayer(municipiosLayer); // Guarda la capa de municipios en el estado
    setDenueLayer(denueLayer); // Guarda la capa de puntos del DENUE en el estado

    // Función de limpieza que se ejecuta al desmontar el componente
    return () => {
      initialMap.setTarget(null); // Elimina el mapa del elemento
      initialMap.getLayers().clear(); // Limpia las capas del mapa
      initialMap.dispose(); // Libera recursos del mapa
    };
  }, []); // El array vacío indica que este useEffect se ejecuta solo una vez

  // Función que se ejecuta cuando se selecciona un municipio en el menú desplegable
  const handleMunicipioChange = (event) => {
    const selectedCVEGEO = event.target.value; // Obtiene el CVEGEO del municipio seleccionado
    setSelectedMunicipio(selectedCVEGEO); // Actualiza el estado del municipio seleccionado

    // Filtrar los puntos dentro del municipio seleccionado
    if (selectedCVEGEO) {
      // Busca el municipio seleccionado en los datos de municipios
      const municipioFeature = municipiosData.features.find(
        (feature) => feature.properties.CVEGEO === selectedCVEGEO
      );

      if (municipioFeature) {
        const municipioGeometry = municipioFeature.geometry; // Obtiene la geometría del municipio

        // Verificar si el municipio tiene una geometría válida
        let municipioPolygon;
        if (municipioGeometry.type === "MultiPolygon") {
          // Filtra los polígonos que tengan al menos 4 puntos
          const validCoordinates = municipioGeometry.coordinates.filter(
            (polygon) => polygon[0].length >= 4
          );

          if (validCoordinates.length > 0) {
            // Crea un MultiPolygon con Turf.js si hay coordenadas válidas
            municipioPolygon = turf.multiPolygon(validCoordinates);
          } else {
            console.error("Geometría inválida en municipio:", selectedCVEGEO);
            return;
          }
        } else if (municipioGeometry.type === "Polygon") {
          // Verifica que el polígono tenga al menos 4 puntos
          if (municipioGeometry.coordinates[0].length >= 4) {
            // Crea un Polygon con Turf.js
            municipioPolygon = turf.polygon(municipioGeometry.coordinates);
          } else {
            console.error("Geometría inválida en municipio:", selectedCVEGEO);
            return;
          }
        }

        // Filtra los puntos que están dentro del polígono del municipio
        const puntosDentro = puntosData.features.filter((point) => {
          const pointCoords = point.geometry.coordinates;
          const turfPoint = turf.point(pointCoords);
          return turf.booleanPointInPolygon(turfPoint, municipioPolygon);
        });

        setPuntosEnMunicipio(puntosDentro); // Actualiza el estado con los puntos encontrados

        // Obtener el bounding box del municipio usando OpenLayers
        const municipioExtent = new GeoJSON()
          .readGeometry(municipioGeometry)
          .getExtent();

        // Aplicar el zoom al municipio seleccionado
        map.getView().fit(municipioExtent, {
          duration: 1000, // Duración del zoom en milisegundos
          padding: [50, 50, 50, 50], // Espaciado alrededor del municipio
        });
      }
    } else {
      setPuntosEnMunicipio([]); // Si no se selecciona ningún municipio, se limpia la lista de puntos
    }
  };

  return (
    <div>
      {/* Menú desplegable para seleccionar un municipio */}
      <select onChange={handleMunicipioChange} value={selectedMunicipio}>
        <option value="">Selecciona un municipio</option>
        {municipiosData.features.map((municipio) => (
          <option
            key={municipio.properties.CVEGEO}
            value={municipio.properties.CVEGEO}
          >
            {municipio.properties.NOMGEO}
          </option>
        ))}
      </select>

      {/* Elemento donde se renderizará el mapa */}
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      {/* Muestra la lista de puntos dentro del municipio seleccionado */}
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
