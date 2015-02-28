package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;

/**
 * Vectorial Math
 */
public abstract class GameMath {

    /**
     * Calculates the distance between two Vector 2
     * @param a
     * @param b
     * @return the distance between a and b
     */
    public static double distance(Vector2 a, Vector2 b){
        float x = a.x - b.x;
        float y = a.y - b.y;
        return java.lang.Math.sqrt(x * x + y * y);
    }



    /**
     * Test if the Rectangle A contains the Rectangle B
     * @param a: Rectangle A
     * @param b: Rectangle B
     * @return: Boolean: Whether or not a contains B
     */
    public static boolean contains(Rectangle a, Rectangle b){
        float xmin = b.x;
        float xmax = xmin + b.width;

        float ymin = b.y;
        float ymax = ymin + b.height;

        return ((xmin >= a.x && xmin <= a.x + a.width) && (xmax >= a.x && xmax <= a.x + a.width))
                && ((ymin >= a.y && ymin <= a.y + a.height) && (ymax >= a.y && ymax <= a.y + a.height));
    }












}
