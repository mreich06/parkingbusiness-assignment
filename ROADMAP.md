# Roadmap

1.  As ParkingBusiness, I want to add a new building with its own layout and tariffs, so we can open more garages after the pilot.
Reason: The brief says more buildings will follow soon if the pilot works so this is the most direct path to more revenue.

2. As a visitor, I want to book and pay for a space before I arrive, so I know I'll get a spot. 
Reason: This brings revenue in earlier and is useful for events.

3. As a business owner, I want to see parking revenue reports, revenue by building and period so I can understand performance and identify opportunities.
Reason: The system already records every session with check-in and check-out times, the amount and the payment, so the data for these reports exists and isn't being used. Revenue by period shows peak and quiet times, which helps set time-based tariffs, so ParkingBusiness can base pricing decisions on real data. 

4. As a parking operator, I want to receive alerts when a gate experiences repeated failures so I can fix the problem or respond before more customers are affected.
Reason: A broken gate costs the business money. Drivers who can't get in or out will complain or they don't come back. The occupancy endpoint already knows how full the garage is, and the API already sees gate errors.

I choose #3 for the spec, PB-07