#ifndef Student_h
#define Student_h

#include "Arduino.h" // Include this for basic Arduino types like String

class Student
{
public:
    // Constructor
    Student(String name, int id);

    // Methods (functions)
    void introduce();
    void setGrade(char newGrade);
    char getGrade();
    String getName();

private:
    // Properties (attributes)
    String _name;
    int _id;
    char _grade; // Default to 'U' for ungraded
};

#endif