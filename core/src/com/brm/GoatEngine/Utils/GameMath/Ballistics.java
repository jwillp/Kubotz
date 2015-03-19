package com.brm.GoatEngine.Utils.GameMath;

/**
 * Contains function used for ballistics
 */
public abstract class Ballistics {



    /**
     * Distance traveled for a projectile
     * @param v velocity
     * @param teta angle at launch
     * @param g gravity of the world
     * @return
     */
    public static float distanceTraveled(float v, float teta, float g){
        return  (float) (v*v * Math.sin(2*teta)/g);
    }


    /**
     * The time of flight it takes for a projectile to finish its trajectory
     * @param v the velocity of the projectile
     * @param g the gravity of the world
     * @return time of flight in seconds
     */
    public static int timeOfFlight(float v, float g){
        return (int) (Math.sqrt(2) * v / g);
    }

    /**
     * The angle (teta) needed at launch for a projectile to travel a certain distance
     * @param v initial velocity
     * @param d distance to be traveled
     * @param g gravity
     * @return angle
     */
    public static float angleOfReach(float v, float d, float g){
        return (float) (0.5f*Math.asin((g * d) / (v * v)));
    }



}
