package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;

/**
 * Vector math
 */
public abstract class GameMath {

    /**
     * Calculates the euclidean distance between two Vector2
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


    /**
     * Calculates the cross product of two Vectors2
     * Normally a cross product is used on 3D vectors.
     * In this case to calculate it for 2D vectors we use
     * z = 0. (because we are in a 2D world)
     * The cross product calculates a perpendicular
     * vector to the two supplied .i.e , a vector that is 90 degrees
     * perpendicular to both of the two vectors
     * @return float
     */
    public static Vector3 crossProduct2D(Vector2 a, Vector2 b){
        Vector3 u = new Vector3(a, 0);
        Vector3 v = new Vector3(b, 0);
        //FORMULA UxV = (UyVz - UzVy,   UzVx - UxVz,    UxVy - UyVx)
        return new Vector3(u.y * v.z - u.z*v.y, u.z*v.x - u.x*v.z, u.x*v.y - u.y*v.x);
    }



    /**
     * Returns whether a values is more or less a given number around another value
     * @param value
     * @param moreOrLess
     * @return
     */
    public static boolean isMoreOrLess(float value, float goalValue, float moreOrLess){
        return ((goalValue - moreOrLess) <= value) && (value <= (goalValue + moreOrLess));
    }




}
