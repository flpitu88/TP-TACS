


package api.rest;

import javax.inject.Inject;
import javax.validation.constraints.NotNull;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;

import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

@Path("/trip-options")
@Security
public class TripOptionsDescriptorResource {
    
    @Inject
    private TripOptionsDescriptorService tods;
    
    @GET
    @Produces("application/json")
    public TripOptionsDescriptor
        findOptions(@NotNull @QueryParam("fromCity") final String fromCity,
            @NotNull @QueryParam("toCity") final String toCity,
            @NotNull @QueryParam("startDate") final String startDate,
            @NotNull @QueryParam("endDate") final String endDate,
            @NotNull @DefaultValue(value = "0") @QueryParam("offset") final int offset,
            @NotNull @DefaultValue(value = "1") @QueryParam("limit") final int limit) {
    
        // tener en cuenta el formato en la UI por el momento
        final DateTimeFormatter fmt = DateTimeFormat.forPattern("dd/MM/yyyy");
        
        return tods.findTripOptions(fromCity, toCity,
            fmt.parseDateTime(startDate), fmt.parseDateTime(endDate), offset,
            limit);
        
    }
}
