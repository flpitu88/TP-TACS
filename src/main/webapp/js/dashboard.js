var mapaNuevoViaje;
var mapaVuelo;
var mapaReview;

var markerOrigen;
var markerDestino;

var markersVuelos = new Array();

var City = function () {
    this.description = null;
    this.geolocation = null;
    this.code = null;
    this.setCityInfo = function (item) {
        this.description = item.label;
        this.code = item.id;
        this.geolocation = item.geolocation;
    };
};

var Trip = function (org, dst, start, end) {
    this.fromCity = org;
    this.toCity = dst;
    this.startDate = start;
    this.endDate = end;
    this.price = null;
    this.outbound = null;
    this.inbound = null;
    this.isReady = function () {
        return this.outbound != null && this.inbound != null;
    };
};

var currentTrip = null;
var opcionesViaje = new Array();

//guardo los datos de la ciudad de origen
var orgCity = new City();
//guardo los datos de la ciudad de destino
var dstCity = new City();

$(function () {
    var contViajes = 0;
    //config google maps
    google.maps.event.addDomListener(window, 'load', initialize);

    formResetViaje();
    formResetVuelos();

    $("a[role=linkViaje]").click(initClickDetalle);
    $("#modDetalleViaje").on("shown.bs.modal", function (e) {
        //hack para que el mapa se dibuje bien
        google.maps.event.trigger(mapaReview, "resize");
    });

    // notificaciones de recomendación *******************************
    /* TODO
     * $("#drpDwnRecomendaciones").click(function(event){
     * 		event.preventDefault();
     * 		acá debería traer las últimas 5 notificaciones y resalto las no leídas
     * });
     * 
     * TODO
     * $("#btnMarcarComoLeidas").click.... marcar las notificaciones como leídas
     */

    $("#verTodasRecomendaciones").click(function (event) {
        event.preventDefault();
        //TODO get lista de recomendaciones completa
        $("#modListaRecomendaciones").modal('show');
    });
    // notificaciones de recomendación *******************************

    // recomendar ****************************************
    var listaAmigosTrucha = ['Juan', 'Pedro', 'Luis', 'Luc&iacute;a', 'Romina', 'Jimena', 'Roberto', 'Julio', 'Makoto', 'Dimitri'];
    $("#btnRecomendarViaje").click(function (event) {
        event.preventDefault();
        $("#modRecomendar").modal("show");
    });

    //TODO habría que hacer que los elementos se te vayan agregando en el input (como el de facebook)
    $("#boxAmigos").autocomplete({
        //TODO get amigoss
        source: listaAmigosTrucha,
        select: function (event, ui) {
            $("#amigosList").append("<li>" + ui.item.value + "</li>");
            $("#boxAmigos").val('');
        }
    });
    // recomendar ****************************************

    //modal nuevo viaje ******************************
    $("#modNuevoViaje").on("shown.bs.modal", function (e) {
        //hack para que el mapa se dibuje bien
        google.maps.event.trigger(mapaNuevoViaje, "resize");
        //posiciono el cursor en la ciudad de origen
        $("#ciudadOrigen").focus();
    });

    $("#btnNuevoViaje").click(function (event) {
        $("#modNuevoViaje").modal('show');
    });

    $("#ciudadOrigen").autocomplete({
        source: function (request, response) {
            $.ajax({
                url: 'http://localhost:8080/api/cities',
                dataType: 'json',
                data: {
                    'name': request.term
                },
                success: function (data) {
                    autocomplete_processCities(data, response);
                }
            });
        },
        minLength: 3,
        select: function (event, ui) {
            $("#fechaDesdeContainer").show();
            orgCity.setCityInfo(ui.item);
            $("#desc-origen").html(orgCity.description);
            markerOrigen = setMapMarker(mapaNuevoViaje, orgCity.geolocation, orgCity.description);
            //me centro en el marker
            mapaNuevoViaje.setCenter(markerOrigen.getPosition());
            mapaNuevoViaje.setZoom(10);
            $("#fechaDesde").focus();
        }
    })
            .data("ui-autocomplete")._renderItem = autocomplete_renderItemCiudades;

    $("#fechaDesde").datepicker({
        dateFormat: 'dd/mm/yy',
        minDate: new Date(),
        todayHighlight: true
    })
            .change(function (e) {
                $("#dstContainter").show();
                //restrinjo la fecha de vuelta teniendo en cuenta la elejida de salida
                var date2 = $('#fechaDesde').datepicker('getDate');
                date2.setDate(date2.getDate() + 1);
                $('#fechaHasta').datepicker('option', 'minDate', date2);
                $("#ciudadDestino").focus();
            });

    $("#ciudadDestino").autocomplete({
        source: function (request, response) {
            $.ajax({
                url: 'http://localhost:8080/api/cities',
                dataType: 'json',
                data: {
                    'name': request.term
                },
                success: function (data) {
                    autocomplete_processCities(data, response);
                }
            });
        },
        minLength: 3,
        select: function (event, ui) {
            //destino
            $("#fechaHastaContainer").show();
            dstCity.setCityInfo(ui.item);
            $("#desc-destino").html(dstCity.description);
            markerDestino = setMapMarker(mapaNuevoViaje, dstCity.geolocation, dstCity.description);
            //hago zoom out para que se vean los dos puntos marcados
            setMapBounds(mapaNuevoViaje);
            $("#fechaHasta").focus();
        }
    })
            .data("ui-autocomplete")._renderItem = autocomplete_renderItemCiudades;

    //#############################################################

    /**
     * Implemento la carga de viajes del usuario mediante rest
     */


    $.ajax({
        url: 'http://localhost:8080/api/trips/1',
        dataType: 'json',
//        data: {
//            'name': request.term
//        },
        success: function (data) {
            $("#itemSinViaje").hide();
            for (var i = 0; i < data.length; i++) {
                $("#listViajes").append(getViajesPropiosHTML(i,data[i]));
                $("div[id=" + i + "] a[role=linkViaje]").click(initClickDetalle);
            }
        }
    });


    $.ajax({
        url: 'http://localhost:8080/trips/friends/1',
        dataType: 'json',
//        data: {
//            'name': request.term
//        },
        success: function (data) {
            for (var i = 0; i < data.length; i++) {
                $("#itemAmigo").append("<div class=\"list-group-item\" id=\"itemAmigo\"> <h5> Hola </h5> </div>");
                $("div[id=" + i + "] a[role=linkViaje]").click(initClickDetalle);
            }
        }
    });



//#############################################################

    $("#fechaHasta").datepicker({
        dateFormat: 'dd/mm/yy',
        todayHighlight: true
    })
            .change(function (e) {
                $("#btnBuscarVuelo").show();
            });
    $("#btnBuscarVuelo").click(function (event) {
        event.preventDefault();
        $("#modVuelos").modal('show');
        currentTrip = new Trip(orgCity, dstCity, $("#fechaDesde").val(), $("#fechaHasta").val());
        getVuelos();
        $("a[role=vueloIda]").click(initClickIda);
    });
    $("#btnCancelarViaje").click(function (event) {
        formResetViaje();
    });
    $("#modVuelos").on("shown.bs.modal", function (e) {
        //hack para que el mapa se dibuje bien
        google.maps.event.trigger(mapaVuelo, "resize");
    });
    //**************************************************

    //modal selección de vuelos ************************
    $("#lstVuevloVuelta").hide();
    $("#boxVuelo").hide();

    $("#cancelVueloIda").click(function (event) {
        event.preventDefault();
        $("#boxVueloIda").hide();
        $("#lstVuevloVuelta").hide();
        $("#lstVuevloIda").show();
    });
    $("#cancelVueloVuelta").click(function (event) {
        event.preventDefault();
        $("#boxVueloVuelta").hide();
        $("#lstVuevloVuelta").show();
    });
    $("#btnViajar").click(function (event) {
        event.preventDefault();
        $("#itemSinViaje").hide();
        /*
         //TODO acá iría el ajax post a viaje. hay un objeto que se llama currentTrip que tiene toda la info del vuelo
         solo me falta agregar los datos de los aeropuertos.
         Todo eso se debería pasar como json en el post a la api
         */
        contViajes++;
        $("#listViajes").append(getViajeHTML(contViajes));

        $("div[id=" + contViajes + "] a[role=linkViaje]").click(initClickDetalle);
        //limpio el form para futuros viajes
        formResetViaje();
        formResetVuelos();
    });
    $("#btnVolver").click(function (e) {
        e.preventDefault();
        $("#modNuevoViaje").modal('show');
        formResetVuelos();
    });
    //**************************************************
});

function getViajeHTML(idViaje) {
    return '<div class="list-group-item" id="' + idViaje + '">'
            + '<h3 class="list-group-item-heading"><a href="#" role="linkViaje">Viaje 1. Desde '
            + currentTrip.fromCity.description
            + ' a '
            + currentTrip.toCity.description
            + ' saliendo el d&iacute;a '
            + currentTrip.outbound.segments[0].departure_datetime
            + ' y volviendo el d&iacute;a '
            + currentTrip.inbound.segments[(currentTrip.inbound.segments.length - 1)].arrival_datetime
            + '</a></h3>'
            + '<p class="list-group-item-text" align="right"><button type="button" class="btn btn-xs btn-primary" id="btnRecomendarViaje">Recomendar <span class="glyphicon glyphicon-share-alt"></span></button> <a href="#">Compartir</a> <a href="#">Eliminar</a></p>'
            + '</div>';
}

function getViajesPropiosHTML(nroViaje, data) {
    return '<div class="list-group-item" id="' + nroViaje + '">'
            + '<h3 class="list-group-item-heading"><a href="#" role="linkViaje">Viaje 1. Desde '
            + data.fromCity.description
            + ' a '
            + data.toCity.description
            + ' saliendo el d&iacute;a '
            + data.outbound.segments[0].departure_datetime
            + ' y volviendo el d&iacute;a '
            + data.inbound.segments[(data.inbound.segments.length - 1)].arrival_datetime
            + '</a></h3>'
            + '<p class="list-group-item-text" align="right"><button type="button" class="btn btn-xs btn-primary" id="btnRecomendarViaje">Recomendar <span class="glyphicon glyphicon-share-alt"></span></button> <a href="#">Compartir</a> <a href="#">Eliminar</a></p>'
            + '</div>';
}

function formResetViaje() {
    $("#frmNuevoViaje")[0].reset();
    $("#btnBuscarVuelo").hide();
    $("#dstContainter").hide();
    $("#orgMapContainer").hide();
    $("#dstMapContainer").hide();
    $("#fechaDesdeContainer").hide();
    $("#fechaHastaContainer").hide();
    markerOrigen = null;
    markerDestino = null;
}

function formResetVuelos() {
    $("#frmVuelos")[0].reset();
    $("#btnViajar").hide();
    $("#sinVuelos").hide();
    $("#boxVuelo").hide();
    $("#lstVuelos").hide();
    $("#cargandoVuelos").show();
    opcionesViaje = Array();
    currentTrip = null;
}


function initClickIda() {
    $("#lstVuevloVuelta").show();
    $("#lstVuevloIda").hide();
    $("#boxVuelo").show();
    getVuelos();
    $("a[role=vueloVuelta]").click(initClickVuelta);
    //TODO levantar las coordenadas de la ciudad de origen y pasarselas a la siguiente función
    markerOrigen = setMapMarker(mapaVuelo, -34.599722222222, -58.381944444444);
    //me centro en el marker
    mapaVuelo.setCenter(markerOrigen.getPosition());
    mapaVuelo.setZoom(10);
}

function initClickVuelta() {
    $("#lstVuevloVuelta").hide();
    $("#boxVueloVuelta").show();
    $("#btnViajar").show();
    markerDestino = setMapMarker(mapaVuelo, 51.507222, -0.1275);
    setMapBounds(mapaVuelo);
    flightPath = new google.maps.Polyline({
        path: [markerOrigen.getPosition(), markerDestino.getPosition()],
        strokeColor: "#00F",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map: mapaVuelo
    });
}

function getVuelos() {
    $.ajax({
        url: 'http://localhost:8080/api/trip-options',
        dataType: 'json',
        data: {
            'fromCity': currentTrip.fromCity.code,
            'toCity': currentTrip.toCity.code,
            'startDate': currentTrip.startDate,
            'endDate': currentTrip.endDate,
            'offset': 0, //TODO falta paginación!
            'limit': 5
        },
        success: function (data) {
            //autocomplete_processCities(data, response);
            //console.log(data);
            $("#cargandoVuelos").hide();
            var datalen = data.items.length;
            if (datalen > 0) {
                $("#sinVuelos").hide();
                $("#lstVuelos").show();
                $("#lstVuelos .list-group").html('');
                opcionesViaje = data.items;
                var i = 0;
                var line;
                for (i = 0; i < datalen; i++) {
                    $("#listaVuelos").append(templateVuelo(i, data.items[i]));
                }
                $("div[role=opciones-vuelo]").hide();
                $("a[role=ver-detalle-vuelo]").click(function (event) {
                    $("div[role=opciones-vuelo][vuelo!=" + $(this).attr("vuelo") + "]").hide();
                    $("div[role=opciones-vuelo][vuelo!=" + $(this).attr("vuelo") + "]").children("input[type=radio]").prop("disabled", true);
                    $("div[role=opciones-vuelo][vuelo=" + $(this).attr("vuelo") + "]").toggle();
                    $("div[role=opciones-vuelo][vuelo=" + $(this).attr("vuelo") + "]").children("input[type=radio]").prop("disabled", false);
                });
                $("input[type=radio][alternativa]").click(function (event) {
                    //$("li[role=opcion-vuelo]").removeClass("vuelo-selected");
                    //$(this).parents("li[role=opcion-vuelo]").addClass("vuelo-selected");
                    var i_vuelo = $(this).parents("div[role=opciones-vuelo]").attr("vuelo");
                    var i_alternativa = $(this).attr('alternativa');
                    var i_type = $(this).parents("div[role=opciones-vuelo]").attr("type");
                    var airportdata = new Array();
                    if (i_type == "ida") {
                        currentTrip.outbound = opcionesViaje[i_vuelo].outbound_choices[i_alternativa];
                        getInfoAirportsAndMap(currentTrip.outbound);
                    }
                    else {
                        currentTrip.inbound = opcionesViaje[i_vuelo].inbound_choices[i_alternativa];
                        getInfoAirportsAndMap(currentTrip.inbound);
                    }
                    currentTrip.price = opcionesViaje[i_vuelo].price_detail;
                    if (currentTrip.isReady()) {
                        $("#btnViajar").show();
                    }
                });
            }
            else {
                $("#lstVuelos").show();
                $("#sinVuelos").show();
            }
        }
    });
}

function getAirportData(code, airportlist) {
    for (var i = 0; i < airportlist.length; i++) {
        if (code == airportlist[i].code) {
            return airportlist[i];
        }
    }
    return null;
}

function getInfoAirportsAndMap(flight) {
    var prep = '';
    prep = "&code=" + flight.airportCodesAsSet.join("&code=")
    $.ajax({
        url: 'http://localhost:8080/api/airports?' + prep,
        dataType: 'json',
        success: function (data) {
            result = data;
            drawFlightRoute(data);
        }
    });
}

var Viaje = function () {
    this.pricedetail = null;
    this.ida = null;
    this.vuelta = null;
}

function getTitleViaje(vuelo) {
    var canttramos = vuelo.segments.length;
    return ' el ' + vuelo.segments[0].departure_datetime +
            ' y llegando el ' + vuelo.segments[(canttramos - 1)].arrival_datetime +
            ((canttramos > 1) ? ' en ' + canttramos + ' escalas' : '') + '.';
}

function getDescripcionViaje(i, viaje, sentido) {
    var canttramos = viaje.segments.length;
    var desc = '<li class="list-group-item" role="opcion-vuelo"><label><input type="radio" name="optradio-' + sentido + '" alternativa="' + i + '" class="vuelo-tramo-ajuste" />';
    for (var i = 0; i < canttramos; i++) {
        desc += '<p class="vuelo-tramos-detail">Vuelo ' + viaje.segments[i].flight_id + ' de ' + viaje.segments[i].airline + ' ' +
                'saliendo de ' + viaje.segments[i].from + ' a las ' + viaje.segments[i].departure_datetime + ' ' +
                'llegando a ' + viaje.segments[i].to + ' a las ' + viaje.segments[i].arrival_datetime + '.</p>';
    }
    return desc + '</label></li>';
}

function templateVuelo(posData, vuelo) {
    var i, j, titleida, titlevuelta;

    var descripcionida = '<li class="list-group-item active">Ida</li>';
    for (i = 0; i < vuelo.outbound_choices.length; i++) {
        descripcionida += getDescripcionViaje(i, vuelo.outbound_choices[i], 'ida');
    }

    var descripcionvuelta = '<li class="list-group-item active">Vuelta</li>';
    for (j = 0; j < vuelo.inbound_choices.length; j++) {
        descripcionvuelta += getDescripcionViaje(j, vuelo.inbound_choices[j], 'vuelta');
    }

    return '<div class="list-group-item" role="vuelo" vuelo="' + posData + '">' +
            '<a href="#" role="ver-detalle-vuelo" vuelo="' + posData + '"><h4 class="list-group-item-heading">Volá por ' + vuelo.price_detail.total + vuelo.price_detail.currency + '</h4></a>' +
            '<div class="list-group" role="opciones-vuelo" vuelo="' + posData + '" type="ida">' + descripcionida + '</div>' +
            '<div class="list-group" role="opciones-vuelo" vuelo="' + posData + '" type="vuelta">' + descripcionvuelta + '</div>' +
            '</div>';
}

function initClickDetalle() {
    // reviso si la lista de recomendaciones está abierta y la cierro si hace falta
    if (typeof $("#modListaRecomendaciones").data("bs.modal") != 'undefined' && $("#modListaRecomendaciones").data("bs.modal").isShown) {
        $("#modListaRecomendaciones").modal("hide");
    }
    //TODO get detalle de viaje (por api)
    $("#modDetalleViaje").modal('show');
}

function getDateFromInput(inputId) {
    var date = $("#" + inputId).datepicker("getDate");
    console.log(date);
    return new Date(date.substring(6, 9), date.substring(3, 4) + 1, date.substring(0, 1));
}

//helpers autocomplete ******************************************************************
function autocomplete_processCities(data, response) {
    if (data.length == 0) {
        data.push({
            'id': '',
            'label': 'No se encotraron ciudades con este nombre',
            'value': ''
        });
        response(data);
    }
    else {
        response($.map(data, function (item) {
            return {
                id: item.code,
                label: item.description,
                value: item.description,
                geolocation: item.geolocation
            }
        }));
    }
}

var autocomplete_renderItemCiudades = function (ul, item) {
    //Add the .ui-state-disabled class and don't wrap in <a> if value is empty
    if (item.id == '') {
        return $('<li class="ui-state-disabled">' + item.label + '</li>').appendTo(ul);
    } else {
        return $("<li>")
                .append("<a>" + item.label + "</a>")
                .appendTo(ul);
    }
};
//*************************************************************************************

/*
 * gmaps functions *******************************************************************
 */
//init de google maps
function initialize() {
    var mapProp = {
        center: new google.maps.LatLng(51.508742, -0.120850),
        zoom: 5,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    mapaNuevoViaje = new google.maps.Map(document.getElementById("googleMapViaje"), mapProp);
    mapaVuelo = new google.maps.Map(document.getElementById("googleMapVuelo"), mapProp);
    mapaReview = new google.maps.Map(document.getElementById("googleMapViajeReview"), mapProp);

    var markerBounds = new google.maps.LatLngBounds();
}

function setMapMarker(map, geolocation, description) {
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(geolocation.latitude, geolocation.longitude),
        map: map,
        title: description
    });
    return marker;
}

function setMapBounds(map) {
    var latlngbounds = new google.maps.LatLngBounds();
    latlngbounds.extend(markerOrigen.getPosition());
    latlngbounds.extend(markerDestino.getPosition());
    map.fitBounds(latlngbounds);
}

function drawFlightRoute(airportdata) {
    markersVuelos = [];
    var latlngbounds = new google.maps.LatLngBounds();
    for (var i = 0; i < airportdata.length; i++) {
        var marker = setMapMarker(mapaVuelo, airportdata[i].geolocation, airportdata[i].description);
        markersVuelos.push(marker);
        latlngbounds.extend(marker.getPosition());
    }
    map.fitBounds(latlngbounds);
    var path = [];
    for (var i = 0; i < markersVuelos.length; i++) {
        path.push(markersVuelos[i].getPosition());
    }
    var color = getRandomColor();
    flightPath = new google.maps.Polyline({
        path: path,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map: mapaVuelo
    });
}

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
/*
 * gmaps functions *******************************************************************
 */

