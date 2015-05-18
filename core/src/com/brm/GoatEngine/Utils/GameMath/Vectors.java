package com.brm.GoatEngine.Utils.GameMath;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;

/**
 * Vector Math
 */
public abstract class Vectors {




    /**
     * Calculates the euclideanDistance between two Vector 2
     * @param a
     * @param b
     * @return the euclideanDistance between a and b
     */
    public static double euclideanDistance(Vector2 a, Vector2 b){
        float x = a.x - b.x;
        float y = a.y - b.y;
        return java.lang.Math.sqrt(x * x + y * y);
    }

    /**
     * Return the manhattan Distance
     * Distance between two points based on adding the horizontal and
     * vertical distances rather than computing the exact difference. (faster than euclidean distance)
     * @param a
     * @param b
     * @return
     */
    public static int manhattanDistance(Vector2 a, Vector2 b){
        int dx = (int) Math.abs(a.x - b.x); //number of moves in x
        int dy = (int) Math.abs(a.y - b.y); //number of moves in y

        return dx + dy;
    }



    /**
     * Test if the Rectangle A contains the Rectangle B inclusive
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
     * Returns the angle between two vectors IN DEGREES
     * @return
     */
    public static float getAngle(Vector2 vec){
        return (float) Math.toDegrees((Math.atan2(vec.y, vec.x)));

    }




}
