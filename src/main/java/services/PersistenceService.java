/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates and open the template
 * in the editor.
 */



package services;

import integracion.facebook.ApellidoFB;
import integracion.facebook.NombreFB;
import integracion.facebook.RecommendationBeanFB;
import integracion.facebook.SearchFriendsFB;
import integracion.facebook.UserRegisteredFB;

import java.util.ArrayList;
import java.util.List;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Invocation;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.GenericType;
import javax.ws.rs.core.Response;

import model.Passenger;
import model.Recommendation;
import model.Trip;

import org.glassfish.jersey.client.ClientConfig;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import repository.PassengerDAO;
import repository.RecommendationDAO;
import repository.TripsDAO;
import apis.PassengerAPI;
import apis.RecommendationAPI;
import apis.TripsAPI;

/**
 *
 * @author Flavio L. Pietrolati
 */
@Service
public class PersistenceService implements PassengerAPI, TripsAPI,
    RecommendationAPI {
    
    @Autowired
    private PassengerDAO psjDao;
    
    @Autowired
    private TripsDAO viajeDao;
    
    @Autowired
    private RecommendationDAO recDao;
    
    public PersistenceService() {
    
    }
    
    @Override
    public List<Passenger> getListOfPassengers() {
    
        return psjDao.getTodosLosPasajeros();
    }
    
    @Override
    public void createPassenger(Passenger p) {
    
        psjDao.guardarPasajero(p);
    }
    
    @Override
    public List<Passenger> getFriendsOfPassenger(String idPsj) {
    
        return psjDao.getAmigos(idPsj);
    }
    
    @Override
    public Passenger getPassengerById(String id) {
    
        Passenger psj = psjDao.getPasajeroById(id);
        return psj;
    }
    
    @Override
    public Passenger postPassengerByIdToken(String id,
        String shortToken) {
    
        Passenger psj = createPassengerToPost(id, shortToken);
        return psj;
    }
    
    @Override
    public List<Recommendation> getRecommendationsOfUser(String id) {
    
        return recDao.getRecomendacionesDeUsuarioPorId(id);
    }
    
    @Override
    public String getRecommendationToString(int id) {
    
        Recommendation rec = recDao.getRecomendacionPorId(id);
        Passenger pass = psjDao.getPasajeroById(rec.getIdUsuarioRecom());
        return pass.getName() + " " + pass.getSurname() +
            " te recomienda viajar de " + rec.getCiudadOrig() + " a " +
            rec.getCiudadDest();
    }
    
    @Override
    public List<Trip> getTripsOfPassenger(String id) {
    
        return viajeDao.searchTripByPassenger(id);
    }
    
    @Override
    public List<Trip> getTrips() {
    
        return viajeDao.getTrips();
    }
    
    @Override
    public void saveTrip(Trip v) {
    
        viajeDao.saveTrip(v);
    }
    
    @Override
    public Recommendation getRecommendationById(int id) {
    
        return recDao.getRecomendacionPorId(id);
    }
    
    @Override
    public void saveRecommendation(Recommendation rec) {
    
        recDao.saveRecommendation(rec);
    }
    
    @Override
    public void assignFriend(String idUser,
        String idFriend) {
    
        psjDao.assignFriend(idUser, idFriend);
    }
    
    @Override
    public Trip getTrip(int id) {
    
        return viajeDao.searchTripById(id);
    }
    
    @Override
    public List<Trip> getTripsOfFriendsOfUser(String id) {
    
        List<String> amigos = psjDao.getIdsAmigos(id);
        List<Trip> viajes = new ArrayList<>();
        if (amigos.isEmpty()) {
            return viajes;
        } else {
            for (String fr : amigos) {
                viajes.addAll(viajeDao.searchTripByPassenger(fr));
            }
        }
        return viajes;
    }
    
    /**
     * ESTAS DOS DE ABAJO SE DEBERIAN HACER AL MOMENTO DE ENVIAR UNA
     * RECOMENDACION Y CREARLA, NO AL MOMENTO DE LEER LAS EXISTENTES
     *
     * @param list
     * @param pass
     */
    @Override
    public void asignarPasajeroARecomendaciones(List<Recommendation> list,
        String pass) {
    
        for (Recommendation rec : list) {
            asignarPasajeroARecomendacion(rec, pass);
        }
    }
    
    @Override
    public void asignarPasajeroARecomendacion(Recommendation rec,
        String pass) {
    
        Passenger pj = psjDao.getPasajeroById(pass);
        rec.setNombreYAp(pj.getName() + " " + pj.getSurname());
    }
    
    @Override
    public String deleteTrip(int id) {
    
        String s = viajeDao.deleteTrip(id);
        return s;
    }
    
    // #########################################################################
    private boolean sonAmigos(String id,
        String idFriend) {
    
        Passenger p = getPassengerById(id);
        // Chequeo que si no existe ese usuario, devuelva lista vacia
        if (p.getFriends() == null) {
            return false;
        }
        if (p.getFriends()
            .contains(idFriend)) {
            return true;
        }
        return false;
    }
    
    private void assignFacebookFriendsToPassenger(Passenger pasajero) {
    
        ClientConfig config = new ClientConfig().register(new JacksonFeature());
        Client client = ClientBuilder.newClient(config);
        WebTarget target =
            client.target("https://graph.facebook.com/v2.3/" +
                pasajero.getIdUser() +
                "/friends?fields=id,first_name,last_name&access_token=" +
                pasajero.getToken());
        Invocation.Builder invocationBuilder = target.request();
        Response response = invocationBuilder.get();
        SearchFriendsFB busqueda =
            response.readEntity(new GenericType<SearchFriendsFB>() {});
        
        /**
         * Ahora solo es una asignacion unidireccional, teniendo en cuenta que
         * se cargan estaticamente usuarios desde el inicio de la aplicacion,
         * pero luego se quitara el comentario para que se asignen amigos hacia
         * ambos lados de la relacion.
         */
        for (UserRegisteredFB fbUs : busqueda.getUsuarios()) {
            if (psjDao.getPasajeroById(fbUs.getId()) != null &&
                sonAmigos(pasajero.getIdUser(), fbUs.getId()) == false) {
                assignFriend(pasajero.getIdUser(), fbUs.getId());
                assignFriend(fbUs.getId(), pasajero.getIdUser());
            }
        }
    }
    
    private Passenger createPassengerToPost(String id,
        String shortToken) {
    
        Passenger buscado = null;
        for (Passenger p : psjDao.getTodosLosPasajeros()) {
            if (p.getIdUser()
                .equals(id)) {
                ClientConfig config =
                    new ClientConfig().register(new JacksonFeature());
                Client client = ClientBuilder.newClient(config);
                WebTarget target =
                    client.target("https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=1586547271608233&client_secret=359a6eae58ad036b4df0c599d0cdd11a&fb_exchange_token=" +
                        shortToken);
                Invocation.Builder invocationBuilder = target.request();
                Response response = invocationBuilder.get();
                String longToken =
                    response.readEntity(new GenericType<String>() {});
                longToken = longToken.substring(13);
                longToken = longToken.split("&", 2)[0];
                buscado = p;
                buscado.setToken(longToken);
                assignFacebookFriendsToPassenger(buscado);
            }
        }
        if (buscado == null) {
            ClientConfig config =
                new ClientConfig().register(new JacksonFeature());
            Client client = ClientBuilder.newClient(config);
            WebTarget target =
                client.target("https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=1586547271608233&client_secret=359a6eae58ad036b4df0c599d0cdd11a&fb_exchange_token=" +
                    shortToken);
            Invocation.Builder invocationBuilder = target.request();
            Response response = invocationBuilder.get();
            String longToken =
                response.readEntity(new GenericType<String>() {});
            longToken = longToken.substring(13);
            longToken = longToken.split("&", 2)[0];
            
            target =
                client.target("https://graph.facebook.com/" + id +
                    "?fields=first_name&access_token=" + longToken);
            invocationBuilder = target.request();
            response = invocationBuilder.get();
            NombreFB nombre =
                response.readEntity(new GenericType<NombreFB>() {});
            
            target =
                client.target("https://graph.facebook.com/" + id +
                    "?fields=last_name&access_token=" + longToken);
            invocationBuilder = target.request();
            response = invocationBuilder.get();
            ApellidoFB apellido =
                response.readEntity(new GenericType<ApellidoFB>() {});
            
            Passenger pasajero =
                new Passenger(id, nombre.getFirst_name(),
                    apellido.getLast_name(), longToken, new ArrayList());
            
            psjDao.guardarPasajero(pasajero);
            assignFacebookFriendsToPassenger(pasajero);
            
            return pasajero;
        }
        return buscado;
    }
    
    @Override
    /**
     * Instancia una recomendacion a partir de los datos recibidos, y la guarda
     * en el DAO correspondiente.
     */
    public void instanceAndSaveRecommendation(RecommendationBeanFB recBean,
        String idUser) {
    
        int idViajeRecom = recBean.getIdTrip();
        String idUsuarioQueRecomienda = recBean.getIdUser();
        Trip viaje = viajeDao.searchTripById(idViajeRecom);
        Passenger psj = psjDao.getPasajeroById(idUsuarioQueRecomienda);
        Recommendation rec =
            new Recommendation(idUser, idUsuarioQueRecomienda, psj.getName() +
                ' ' + psj.getSurname(), viaje.getFromCity(), viaje.getToCity(),
                idViajeRecom);
        recDao.saveRecommendation(rec);
    }
    
    @Override
    public void assignStateRecommendation(int idRec,
        String state) {
    
        Recommendation rec = recDao.getRecomendacionPorId(idRec);
        if (state.equals("acp")) {
            rec.aceptarRecomendacion();
            /**
             * Al aceptar la recomendacion, creo un viaje con los mismos datos
             * para el usuario que la acepto.
             */
            Trip viajeRecom = viajeDao.searchTripById(rec.getTripRec());
            Trip newTrip =
                new Trip(rec.getIdUsuarioRecom(), viajeRecom.getFromCity(),
                    viajeRecom.getToCity(), viajeRecom.getPrice(),
                    viajeRecom.getItinerary());
            viajeDao.saveTrip(newTrip);
        } else if (state.equals("rej")) {
            rec.rechazarRecomendacion();
            // recDao.deleteRecommendation(idRec);
        }
    }
    
}
