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
import { Draw } from "ol/interaction"; // Importa la interacción Draw para dibujar en el mapa
import * as turf from "@turf/turf"; // Importa la biblioteca Turf.js para operaciones geoespaciales
import puntosData from "./denue_inegi_20_.json"; // Importa los datos de puntos del DENUE

function Mapa() {
  const mapRef = useRef(); // Referencia al elemento del mapa
  const [map, setMap] = useState(null); // Estado para almacenar la instancia del mapa
  const [denueLayer, setDenueLayer] = useState(null); // Estado para almacenar la capa de puntos del DENUE
  const [puntosEnPoligono, setPuntosEnPoligono] = useState([]); // Estado para almacenar los puntos dentro del polígono dibujado
  const [draw, setDraw] = useState(null); // Estado para la herramienta de dibujo

  useGeographic(); // Indica a OpenLayers que se utilizarán coordenadas geográficas

  useEffect(() => {
    // Este useEffect se ejecuta solo una vez al montar el componente

    // Crea una fuente vectorial con los datos GeoJSON importados
    const puntosSource = new VectorSource({
      features: new GeoJSON().readFeatures(puntosData),
    });

    // Crea una capa vectorial para los puntos del DENUE
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
        denueLayer, // Capa de puntos del DENUE
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Coordenadas del centro inicial
        zoom: 9, // Nivel de zoom inicial
      }),
    });

    setMap(initialMap); // Guarda la instancia del mapa en el estado
    setDenueLayer(denueLayer); // Guarda la capa de puntos del DENUE en el estado

    // Función de limpieza que se ejecuta al desmontar el componente
    return () => {
      initialMap.setTarget(null); // Elimina el mapa del elemento
      initialMap.getLayers().clear(); // Limpia las capas del mapa
      initialMap.dispose(); // Libera recursos del mapa
    };
  }, []); // El array vacío indica que este useEffect se ejecuta solo una vez

  // Activar/desactivar la herramienta de dibujo
  const toggleDraw = () => {
    if (draw) {
      map.removeInteraction(draw); // Elimina la interacción de dibujo si ya existe
      setDraw(null); // Actualiza el estado para indicar que no hay herramienta de dibujo activa
    } else {
      // Crea una nueva interacción de dibujo de tipo "Polygon"
      const drawInteraction = new Draw({
        source: new VectorSource(), // La fuente donde se guardará el polígono dibujado
        type: "Polygon", // Tipo de geometría a dibujar
      });

      // Agrega un event listener para el evento "drawend" (cuando se termina de dibujar el polígono)
      drawInteraction.on("drawend", handleDrawEnd);
      map.addInteraction(drawInteraction); // Agrega la interacción de dibujo al mapa
      setDraw(drawInteraction); // Actualiza el estado para indicar que la herramienta de dibujo está activa
    }
  };

  // Maneja el evento cuando se completa un polígono
  const handleDrawEnd = (event) => {
    const drawnFeature = event.feature; // Obtiene la característica dibujada (el polígono)
    const drawnPolygon = new GeoJSON().writeFeatureObject(drawnFeature); // Convierte la característica a un objeto GeoJSON

    // Verifica si el polígono tiene al menos 3 puntos (para que sea válido)
    if (drawnPolygon.geometry.coordinates[0].length >= 4) {
      const polygon = turf.polygon(drawnPolygon.geometry.coordinates); // Crea un polígono Turf.js a partir de las coordenadas

      // Filtra los puntos que están dentro del polígono dibujado
      const puntosDentro = puntosData.features.filter((point) => {
        const pointCoords = point.geometry.coordinates;
        const turfPoint = turf.point(pointCoords); // Crea un punto Turf.js a partir de las coordenadas del punto
        return turf.booleanPointInPolygon(turfPoint, polygon); // Verifica si el punto está dentro del polígono
      });

      setPuntosEnPoligono(puntosDentro); // Actualiza el estado con los puntos filtrados
    }
  };

  return (
    <div>
      {/* Botón para activar/desactivar el dibujo de polígonos */}
      <button onClick={toggleDraw}>
        {draw ? "Desactivar Filtro" : "Activar Filtro"}
      </button>

      {/* Elemento donde se renderizará el mapa */}
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      {/* Lista de puntos dentro del polígono dibujado */}
      {puntosEnPoligono.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Puntos dentro del polígono:</h3>
          <ul>
            {puntosEnPoligono.map((point, index) => {
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
