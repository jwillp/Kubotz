package com.brm.GoatEngine.Math;

import com.badlogic.gdx.math.Vector2;

/**
 * Vectorial Math
 */
public abstract class VectorMath {

    /**
     * Calculates the distance between a Vector2 a and a Vector2 b
     * @param a
     * @param b
     * @return the distance between a and b
     */
    public static double distance(Vector2 a, Vector2 b){
        float x = a.x - b.x;
        float y = a.y - b.y;
        return Math.sqrt(x*x+y*y);
    }

}
